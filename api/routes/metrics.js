const express = require('express');

const router = express.Router();

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

router.get('/', async (req, res, next) => {
  try {
    const client = req.app.locals.redis;
    const [depthRaw, latencyRaw, stalled, waitsRaw, starvationBoostsRaw, precisionRaw] = await Promise.all([
      client.lrange('scheduler:metrics:depth', 0, 119),
      client.lrange('scheduler:metrics:latency', 0, 499),
      client.get('scheduler:metrics:stalled'),
      client.lrange('scheduler:metrics:waits', 0, 999),
      client.get('scheduler:metrics:starvation_boosts'),
      client.lrange('scheduler:metrics:precision', 0, 499)
    ]);

    const queueDepthHistory = depthRaw
      .map(safeParse)
      .filter(Boolean)
      .reverse();

    const latencies = latencyRaw
      .map(Number)
      .filter(n => Number.isFinite(n) && n >= 0);

    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const waits = waitsRaw
      .map(safeParse)
      .filter(Boolean);

    const maxWaitByPriority = {};
    const priorityBands = {
      p1_2: 0,  // Urgent
      p3_4: 0,  // High
      p5_6: 0,  // Normal
      p7_10: 0  // Low (Starvation Watch)
    };

    for (const item of waits) {
      const prio = Number(item.priority ?? 5);
      const wait = Number(item.waitMs) || 0;
      maxWaitByPriority[String(prio)] = Math.max(maxWaitByPriority[String(prio)] || 0, wait);

      // Track by priority band
      if (prio <= 2) {
        priorityBands.p1_2 = Math.max(priorityBands.p1_2, wait);
      } else if (prio <= 4) {
        priorityBands.p3_4 = Math.max(priorityBands.p3_4, wait);
      } else if (prio <= 6) {
        priorityBands.p5_6 = Math.max(priorityBands.p5_6, wait);
      } else {
        priorityBands.p7_10 = Math.max(priorityBands.p7_10, wait);
      }
    }

    // Scheduling precision intentionally includes delayed jobs only. Immediate-job
    // queue wait is a throughput measurement, not a scheduler precision signal.
    const deltas = precisionRaw.map(safeParse).filter(Boolean).map(item => Number(item.deltaMs)).filter(Number.isFinite);
    const avgDeltaMs = deltas.length
      ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
      : 0;
    const minDeltaMs = deltas.length ? Math.min(...deltas) : 0;
    const maxDeltaMs = deltas.length ? Math.max(...deltas) : 0;

    const oneMinuteAgo = Date.now() - 60000;
    const recentCompleted = waits.filter(item => item.at && item.at >= oneMinuteAgo);
    const throughput = recentCompleted.length;

    res.json({
      queueDepthHistory,
      throughput,
      avgLatency,
      stalledCount: Number(stalled || 0),
      maxWaitByPriority,
      maxWaitByPriorityBand: priorityBands,
      starvationBoosts: Number(starvationBoostsRaw || 0),
      schedulingPrecision: {
        avgDeltaMs,
        minDeltaMs,
        maxDeltaMs,
        evaluatedCount: deltas.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
