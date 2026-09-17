require('dotenv').config();
const { Worker } = require('bullmq');
const os = require('os');
const { redis, connectionOptions, publish } = require('../api/lib');

const args = process.argv.slice(2);
let id = null;
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--id=')) {
    id = args[i].split('=')[1];
  } else if (args[i] === '--id' && args[i + 1]) {
    id = args[i + 1];
    i++;
  }
}
if (!id) {
  id = process.env.WORKER_ID || String(process.pid);
}

const queues = (process.env.WORKER_QUEUES || 'default,critical,email,reports')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

const client = redis();
let currentJobId = null;
let processedCount = 0;

async function heartbeat() {
  const entry = {
    id: String(id),
    status: 'online',
    pid: process.pid,
    hostname: os.hostname(),
    currentJobId,
    lastHeartbeat: Date.now(),
    processedCount,
    queues
  };
  await client.sadd('scheduler:workers:known', String(id));
  await client.set(`worker:${id}`, JSON.stringify(entry), 'EX', 15);
  await publish(client, 'worker:heartbeat', entry);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processJob(job) {
  currentJobId = String(job.id);
  await heartbeat();

  const processedAt = Date.now();
  const scheduledFor = (job.data && job.data.scheduledFor) || job.timestamp;
  const schedulingDeltaMs = Math.max(0, processedAt - scheduledFor);

  await job.updateData({ ...job.data, processedAt });

  const record = {
    id: String(job.id),
    queue: job.queueName,
    priority: (job.opts && job.opts.priority) || 0,
    scheduledFor,
    processedAt,
    schedulingDeltaMs,
    workerId: String(id)
  };
  await publish(client, 'job:active', record);

  const payload = job.data && job.data.payload ? job.data.payload : {};

  // Idempotency Guard:
  // At-least-once delivery + Idempotent handlers = Effectively-once execution.
  // Guard against duplicate execution across retries, reassignments, or multi-delivery.
  const customKey = payload.idempotencyKey ? String(payload.idempotencyKey) : null;
  const dedupKey = customKey
    ? `scheduler:idempotency:custom:${customKey}`
    : `scheduler:idempotency:job:${job.id}`;

  const previousResult = await client.get(dedupKey);
  if (previousResult) {
    console.log(`[Idempotency] Job #${job.id} previously executed. Skipping duplicate side-effects.`);
    return {
      workerId: String(id),
      idempotentSkip: true,
      note: 'Skipped side-effects: handler is idempotent',
      processedAt
    };
  }

  const workMs = Number(payload.workMs) || (2000 + Math.floor(Math.random() * 6001));
  await sleep(workMs);

  if (payload.forceFail) {
    throw new Error('forced demo failure');
  }

  // 10% simulated transient failure to exercise retries (unless explicitly disabled)
  if (!payload.noSimulatedFailures && Math.random() < 0.10) {
    throw new Error('simulated transient worker failure');
  }

  const result = { workerId: String(id), workMs, processedAt };

  // Store completion marker with 24-hour TTL
  await client.set(dedupKey, JSON.stringify(result), 'EX', 86400);

  return result;
}

// Pass the shared connection options object (not a raw IORedis instance)
// so that BullMQ creates its own blocking connection with full privileges.
const workerInstances = queues.map(name => {
  const worker = new Worker(name, processJob, {
    connection: {
      host: connectionOptions.host,
      port: connectionOptions.port,
      username: connectionOptions.username,
      password: connectionOptions.password,
      db: connectionOptions.db,
      maxRetriesPerRequest: null,
      connectTimeout: 10000,
      retryStrategy: times => Math.min(times * 150, 2000)
    },
    concurrency: 1,
    lockDuration: 6000,
    stalledInterval: 3000,
    maxStalledCount: 2
  });

  worker.on('completed', async (job, result) => {
    processedCount++;
    currentJobId = null;
    await heartbeat();

    const processedAt = (job.data && job.data.processedAt) || Date.now();
    const scheduledFor = (job.data && job.data.scheduledFor) || job.timestamp;
    const waitMs = Math.max(0, processedAt - scheduledFor);
    const latency = Date.now() - processedAt;

    await client.lpush('scheduler:metrics:waits', JSON.stringify({
      priority: (job.opts && job.opts.priority) || 0,
      waitMs,
      at: Date.now()
    }));
    await client.ltrim('scheduler:metrics:waits', 0, 999);

    await client.lpush('scheduler:metrics:latency', String(latency));
    await client.ltrim('scheduler:metrics:latency', 0, 499);

    await publish(client, 'job:completed', {
      id: String(job.id),
      queue: name,
      workerId: String(id),
      scheduledFor,
      processedAt,
      schedulingDeltaMs: waitMs,
      result
    });
  });

  worker.on('failed', async (job, error) => {
    currentJobId = null;
    await heartbeat();
    await publish(client, 'job:failed', {
      id: job ? String(job.id) : null,
      queue: name,
      workerId: String(id),
      attemptsMade: job ? job.attemptsMade : 0,
      error: error.message
    });
  });

  worker.on('stalled', async jobId => {
    await client.incr('scheduler:metrics:stalled');
    await publish(client, 'job:stalled', { id: String(jobId), queue: name });
    await publish(client, 'job:reassigned', {
      id: String(jobId),
      queue: name,
      note: 'BullMQ reassigned stalled job to waiting queue'
    });
  });

  worker.on('error', error => {
    // Suppress expected retry noise; only log unexpected ones
    if (!error.message.includes('EACCES') && !error.message.includes('ECONNREFUSED')) {
      console.error(`[worker ${id}/${name}]`, error.message);
    }
  });

  return worker;
});

heartbeat().catch(error => {
  console.error('Initial heartbeat failed:', error.message);
  process.exit(1);
});

const timer = setInterval(() => {
  heartbeat().catch(error => console.error('Heartbeat tick error:', error.message));
}, 3000);

async function shutdown() {
  clearInterval(timer);
  try {
    await client.del(`worker:${id}`);
    await publish(client, 'worker:down', { id: String(id), reason: 'process stopped gracefully' });
  } catch {}
  await Promise.all(workerInstances.map(w => w.close().catch(() => {})));
  await client.quit().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Worker ${id} (PID ${process.pid}) online. Watching queues: ${queues.join(', ')}`);
