require('dotenv').config();
const { randomUUID } = require('crypto');
const { queue, redis, rememberQueue, publish } = require('../api/lib');

const apiUrl = process.env.API_URL || 'http://localhost:4000';
const client = redis();

async function enqueueJob(queueName, payload, options = {}) {
  // Try HTTP first so server broadcaster and client events stay completely uniform
  try {
    const res = await fetch(`${apiUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queue: queueName,
        payload,
        delayMs: options.delay || 0,
        priority: options.priority || 5,
        cron: options.cron || undefined
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API not reachable, fall back to direct BullMQ queue
  }

  const delay = options.delay || 0;
  const scheduledFor = Date.now() + delay;
  const q = queue(queueName);
  const bullOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    priority: options.priority || 5,
    delay,
    removeOnComplete: false,
    removeOnFail: false,
    jobId: randomUUID()
  };
  if (options.cron) {
    bullOptions.repeat = { pattern: String(options.cron) };
  }

  const job = await q.add('task', { payload, scheduledFor, cron: options.cron || null }, bullOptions);
  await rememberQueue(client, queueName);
  await publish(client, 'job:added', {
    id: String(job.id),
    queue: queueName,
    priority: job.opts.priority,
    delayMs: delay,
    scheduledFor,
    status: delay > 0 ? 'delayed' : 'waiting'
  });
  return job;
}

(async () => {
  console.log('Seeding demo jobs...');
  await Promise.all([
    enqueueJob('default', { label: 'Immediate standard task', workMs: 3500 }, { priority: 5 }),
    enqueueJob('default', { label: 'Urgent task (priority jump)', workMs: 2500 }, { priority: 1 }),
    enqueueJob('critical', { label: 'Mission critical VIP job', workMs: 2000 }, { priority: 1 }),
    enqueueJob('email', { label: 'Welcome email notification (delayed)', workMs: 1500 }, { delay: 10000, priority: 3 }),
    // Fails exactly the first three automatic attempts, then succeeds when the
    // evaluator presses Reprocess in the DLQ. This makes the retry demo real.
    enqueueJob('reports', { label: 'End of day report (DLQ retry demo)', forceFailAttempts: 3, noSimulatedFailures: true }, { priority: 4 })
  ]);

  console.log('Seeded jobs successfully:');
  console.log(' - [default] Immediate standard task (priority 5)');
  console.log(' - [default] Urgent task (priority 1, tests priority jumping)');
  console.log(' - [critical] Mission critical VIP job (priority 1)');
  console.log(' - [email] Welcome email notification (delayed 10s)');
  console.log(' - [reports] End of day report (fails 3x, then succeeds after DLQ reprocess)');

  await client.quit();
})().catch(error => {
  console.error('Seed error:', error);
  process.exit(1);
});
