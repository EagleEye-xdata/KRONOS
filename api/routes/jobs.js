const express = require('express');
const { randomUUID } = require('crypto');
const { queue, rememberQueue, publish, asNumber } = require('../lib');

const router = express.Router();
const allowedStatuses = new Set(['waiting', 'active', 'completed', 'failed', 'delayed']);

function serialize(job) {
  if (!job) return null;
  const delay = job.opts && job.opts.delay ? job.opts.delay : 0;
  const scheduledFor = (job.data && job.data.scheduledFor) || (job.timestamp + delay);
  const processedAt = (job.data && job.data.processedAt) || job.processedOn || null;
  const schedulingDeltaMs = processedAt ? Math.max(0, processedAt - scheduledFor) : null;

  return {
    id: String(job.id),
    queue: job.queueName,
    name: job.name,
    payload: job.data ? job.data.payload : undefined,
    priority: (job.opts && job.opts.priority) || 0,
    attempts: (job.opts && job.opts.attempts) || 1,
    attemptsMade: job.attemptsMade || 0,
    delayMs: delay,
    cron: (job.data && job.data.cron) || null,
    scheduledFor,
    processedAt,
    schedulingDeltaMs,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn || null,
    failedReason: job.failedReason || null,
    returnvalue: job.returnvalue || null
  };
}

async function getNormalizedState(job) {
  try {
    const rawState = await job.getState();
    if (rawState === 'prioritized') return 'waiting';
    return rawState;
  } catch {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }
}

router.post('/', async (req, res, next) => {
  try {
    const { queue: queueName, payload = {}, delayMs = 0, priority = 5, cron } = req.body || {};
    if (!queueName || typeof queueName !== 'string') {
      return res.status(400).json({ error: 'queue is required' });
    }
    const delay = Math.max(0, asNumber(delayMs, 0));
    const prio = Math.max(1, asNumber(priority, 5));
    const options = {
      delay,
      priority: prio,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: false,
      removeOnFail: false,
      // BullMQ job IDs are otherwise only unique within a physical queue.
      // The public API uses /api/jobs/:id across all queues, so make them global.
      jobId: randomUUID()
    };
    if (cron) {
      options.repeat = { pattern: String(cron) };
    }
    const scheduledFor = Date.now() + delay;
    const q = queue(queueName);
    const job = await q.add('task', { payload, scheduledFor, cron: cron || null, originalPriority: prio }, options);
    await rememberQueue(req.app.locals.redis, queueName);

    const record = { ...serialize(job), status: delay > 0 ? 'delayed' : 'waiting' };
    await publish(req.app.locals.redis, 'job:added', record);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const requestedStatus = req.query.status;
    if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
      return res.status(400).json({ error: `invalid status: must be one of ${Array.from(allowedStatuses).join(', ')}` });
    }

    const names = req.query.queue ? [req.query.queue] : await req.app.locals.queueNames(req.app.locals.redis);
    const limit = Math.min(500, Math.max(1, asNumber(req.query.limit, 100)));

    let statesToFetch;
    if (requestedStatus === 'waiting') {
      statesToFetch = ['waiting', 'prioritized'];
    } else if (requestedStatus) {
      statesToFetch = [requestedStatus];
    } else {
      statesToFetch = ['waiting', 'active', 'completed', 'failed', 'delayed', 'prioritized'];
    }

    const jobsPerQueue = await Promise.all(names.map(async name => {
      const q = queue(name);
      const rows = await q.getJobs(statesToFetch, 0, limit - 1, true);
      return Promise.all(rows.map(async job => {
        const status = await getNormalizedState(job);
        return {
          ...serialize(job),
          status
        };
      }));
    }));

    let allJobs = jobsPerQueue.flat();
    if (requestedStatus) {
      allJobs = allJobs.filter(j => j.status === requestedStatus);
    }
    allJobs.sort((a, b) => b.timestamp - a.timestamp);
    res.json(allJobs.slice(0, limit));
  } catch (error) {
    next(error);
  }
});

async function findJob(app, id) {
  const names = await app.locals.queueNames(app.locals.redis);
  for (const name of names) {
    const job = await queue(name).getJob(id);
    if (job) return job;
  }
  return null;
}

router.get('/:id', async (req, res, next) => {
  try {
    const job = await findJob(req.app, req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });
    const status = await getNormalizedState(job);
    res.json({ ...serialize(job), status });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/retry', async (req, res, next) => {
  try {
    const job = await findJob(req.app, req.params.id);
    if (!job) return res.status(404).json({ error: 'job not found' });
    const isFailed = await job.isFailed();
    if (!isFailed) return res.status(409).json({ error: 'only failed jobs can be retried' });

    await job.retry();
    const updatedJob = (await findJob(req.app, req.params.id)) || job;
    const status = await getNormalizedState(updatedJob);
    const record = { ...serialize(updatedJob), status, retried: true };
    await publish(req.app.locals.redis, 'job:added', record);
    res.json(record);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.serialize = serialize;
module.exports.getNormalizedState = getNormalizedState;
