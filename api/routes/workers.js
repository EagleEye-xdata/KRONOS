const express = require('express');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { publish } = require('../lib');

const router = express.Router();
const spawnedChildren = new Map();

async function workers(app) {
  const ids = await app.locals.redis.smembers('scheduler:workers:known');
  const rows = await Promise.all(ids.map(async id => {
    const raw = await app.locals.redis.get(`worker:${id}`);
    if (!raw) {
      return {
        id: String(id),
        status: 'offline',
        currentJobId: null,
        lastHeartbeat: null,
        processedCount: 0
      };
    }
    try {
      const value = JSON.parse(raw);
      const age = Date.now() - (value.lastHeartbeat || 0);
      let status = 'online';
      if (value.killed || age > 10000) {
        status = 'offline';
      } else if (age > 4500) {
        status = 'stalled';
      }
      return {
        id: String(id),
        status,
        currentJobId: status === 'online' ? (value.currentJobId || null) : null,
        lastHeartbeat: value.lastHeartbeat || null,
        processedCount: Number(value.processedCount || 0),
        pid: value.pid || null,
        hostname: value.hostname || null,
        queues: value.queues || []
      };
    } catch {
      return {
        id: String(id),
        status: 'offline',
        currentJobId: null,
        lastHeartbeat: null,
        processedCount: 0
      };
    }
  }));

  return rows.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await workers(req.app));
  } catch (error) {
    next(error);
  }
});

// Optional endpoint to spawn a worker directly from API control plane
router.post('/spawn', async (req, res, next) => {
  try {
    const customId = req.body && req.body.id ? String(req.body.id) : String(Date.now() % 10000);
    const workerScript = path.resolve(__dirname, '../../worker/worker.js');
    const child = spawn(process.execPath, [workerScript, `--id=${customId}`], {
      detached: false,
      stdio: 'inherit',
      env: { ...process.env }
    });

    spawnedChildren.set(customId, child);
    child.on('exit', () => {
      spawnedChildren.delete(customId);
    });

    res.status(201).json({ id: customId, pid: child.pid, spawned: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/kill', async (req, res, next) => {
  const id = String(req.params.id);
  try {
    const raw = await req.app.locals.redis.get(`worker:${id}`);
    let pid = null;
    let workerData = {};

    if (raw) {
      try {
        workerData = JSON.parse(raw);
        pid = workerData.pid;
      } catch {}
    }

    // Check if tracked in spawnedChildren map before comparing process scopes.
    const child = spawnedChildren.get(id);

    // A PID reported by a Compose worker is scoped to that worker's container.
    // Never signal it from the API container: identical PID values could belong
    // to the API process itself. API-spawned workers remain safe to terminate.
    if (!child && workerData.hostname && workerData.hostname !== os.hostname()) {
      return res.status(409).json({
        id,
        killed: false,
        note: `Worker runs in another container. Use: docker compose kill worker-${id}`
      });
    }

    if (child && child.pid) {
      pid = child.pid;
    }

    let killed = false;
    let killError = null;

    if (pid) {
      try {
        if (child) {
          child.kill('SIGKILL');
          killed = true;
        } else {
          process.kill(pid, 'SIGKILL');
          killed = true;
        }
      } catch (err) {
        // Fallback for Windows if process.kill threw
        if (process.platform === 'win32') {
          try {
            const { execSync } = require('child_process');
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            killed = true;
          } catch (winErr) {
            killError = winErr.message;
          }
        } else {
          killError = err.message;
        }
      }
    }

    // Mark worker as killed and offline in Redis
    workerData.killed = true;
    workerData.status = 'offline';
    workerData.currentJobId = null;
    await req.app.locals.redis.set(`worker:${id}`, JSON.stringify(workerData), 'EX', 3600);
    await publish(req.app.locals.redis, 'worker:down', { id, reason: 'killed by demo control' });

    if (!pid && !killed) {
      return res.status(200).json({
        id,
        killed: false,
        note: 'Worker state marked offline in Redis. If running in an external terminal, terminate it manually.'
      });
    }

    res.json({ id, killed: true, pid });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.workers = workers;
