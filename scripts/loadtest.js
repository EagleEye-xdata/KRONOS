require('dotenv').config();

const base = process.env.API_URL || 'http://localhost:4000';
const total = Number(process.env.JOBS || 100);
const highTotal = Number(process.env.HIGH_PRIORITY_JOBS || 80);

(async () => {
  console.log(`Starting load test against ${base} with ${total} low-priority jobs...`);
  const started = Date.now();

  const batchSize = 25;
  for (let i = 0; i < total; i += batchSize) {
    const chunk = Array.from({ length: Math.min(batchSize, total - i) }, (_, idx) => {
      const jobIdx = i + idx;
      return fetch(`${base}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue: 'default',
          payload: { label: `batch-task-lp-${jobIdx}`, workMs: 1500 },
          priority: 10
        })
      });
    });
    await Promise.all(chunk);
  }

  console.log(`Spiked queue 'default' with ${total} low-priority (P10) jobs in ${Date.now() - started}ms.`);

  // Now inject the High Priority job into the SAME queue to prove starvation prevention
  console.log(`Sustaining the queue with ${highTotal} P1 jobs to test priority aging...`);
  for (let i = 0; i < highTotal; i++) {
    await fetch(`${base}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queue: 'default',
        payload: { label: `urgent-flood-${i}`, workMs: 800, noSimulatedFailures: true },
        priority: 1
      })
    });
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  console.log('Watch /api/metrics: starvationBoosts should increase after 10s and P10 work should make bounded progress.');
})().catch(error => {
  console.error('Loadtest error:', error);
  process.exit(1);
});
