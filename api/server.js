require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { redis, queue, queueNames, publish } = require('./lib');
const { workers } = require('./routes/workers');

const app = express();
const client = redis();
const subscriber = redis();
const clients = new Set();

app.locals.redis = client;
app.locals.queueNames = queueNames;
app.locals.clients = clients;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/queues', require('./routes/queues'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/stream', require('./routes/stream'));

app.get('/health', (_, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'internal server error' });
});

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const clientRes of clients) {
    try {
      clientRes.write(payload);
    } catch {
      clients.delete(clientRes);
    }
  }
}

subscriber.subscribe('scheduler:events').then(() => {
  subscriber.on('message', (_channel, raw) => {
    try {
      const event = JSON.parse(raw);
      broadcast(event);
    } catch {}
  });
}).catch(err => {
  console.error('Failed to subscribe to scheduler:events:', err.message);
});

let previousOnlineWorkers = new Set();
let isTicking = false;

setInterval(async () => {
  if (isTicking) return;
  isTicking = true;
  try {
    const names = await queueNames(client);
    const queueCounts = await Promise.all(names.map(async name => {
      const q = queue(name);
      const raw = await q.getJobCounts('waiting', 'active', 'delayed', 'prioritized');
      return {
        name,
        counts: {
          waiting: (raw.waiting || 0) + (raw.prioritized || 0),
          active: raw.active || 0,
          delayed: raw.delayed || 0
        }
      };
    }));

    const total = queueCounts.reduce((sum, item) => sum + Object.values(item.counts).reduce((a, b) => a + b, 0), 0);
    const depth = {
      timestamp: new Date().toISOString(),
      total,
      queues: queueCounts
    };

    await client.lpush('scheduler:metrics:depth', JSON.stringify(depth));
    await client.ltrim('scheduler:metrics:depth', 0, 119);
    await publish(client, 'queue:depth', depth);

    const currentWorkerList = await workers(app);
    const currentOnlineIds = new Set(
      currentWorkerList.filter(w => w.status === 'online').map(w => w.id)
    );

    for (const prevId of previousOnlineWorkers) {
      if (!currentOnlineIds.has(prevId)) {
        await publish(client, 'worker:down', { id: prevId, reason: 'heartbeat expired or killed' });
      }
    }
    previousOnlineWorkers = currentOnlineIds;

    await publish(client, 'worker:heartbeat', currentWorkerList);
  } catch (error) {
    console.error('telemetry tick error:', error.message);
  } finally {
    isTicking = false;
  }
}, 1000).unref();

// Anti-Starvation Mechanism: Priority Aging Sweep
// Every 3 seconds, scan up to 1,000 waiting tasks across all active queues.
// If a lower-priority task has waited > 10,000ms, progressively boost its priority
// so old low-priority tasks cannot be starved by incoming high-priority floods.
let isAgingSweepRunning = false;
setInterval(async () => {
  if (isAgingSweepRunning) return;
  isAgingSweepRunning = true;
  try {
    const names = await queueNames(client);
    const now = Date.now();
    for (const name of names) {
      const q = queue(name);
      for (let offset = 0; offset < 1000; offset += 100) {
        const waitingJobs = await q.getJobs(['waiting', 'prioritized'], offset, offset + 99, true);
        if (!waitingJobs.length) break;
        for (const job of waitingJobs) {
          const currentPrio = (job.opts && job.opts.priority) || 5;
          if (currentPrio <= 1) continue; // Already highest priority

          const waitMs = now - ((job.data && job.data.scheduledFor) || job.timestamp);
          // If waiting more than 10 seconds, boost by 1 priority level per 5 seconds of wait.
          if (waitMs > 10000) {
            const boostSteps = Math.min(currentPrio - 1, Math.max(1, Math.floor((waitMs - 5000) / 5000)));
            const newPrio = Math.max(1, currentPrio - boostSteps);
            if (newPrio < currentPrio) {
              await job.changePriority({ priority: newPrio });
              await publish(client, 'job:aged', {
                id: String(job.id),
                queue: name,
                oldPriority: currentPrio,
                newPriority: newPrio,
                waitMs,
                reason: 'anti-starvation aging boost'
              });
              await client.incr('scheduler:metrics:starvation_boosts');
            }
          }
        }
        if (waitingJobs.length < 100) break;
      }
    }
  } catch (err) {
    // Non-fatal telemetry loop
  } finally {
    isAgingSweepRunning = false;
  }
}, 3000).unref();

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Scheduler API listening on http://localhost:${port}`);
});
