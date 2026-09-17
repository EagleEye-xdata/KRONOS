const express = require('express');
const { queue } = require('../lib');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const names = await req.app.locals.queueNames(req.app.locals.redis);
    const result = await Promise.all(names.map(async name => {
      const q = queue(name);
      const raw = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'prioritized');
      return {
        name,
        counts: {
          waiting: (raw.waiting || 0) + (raw.prioritized || 0),
          active: raw.active || 0,
          completed: raw.completed || 0,
          failed: raw.failed || 0,
          delayed: raw.delayed || 0
        }
      };
    }));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
