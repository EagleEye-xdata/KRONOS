# Mentor Evaluation & Live Demo Runbook

This runbook matches the official mentor evaluation guidelines for the **Distributed Task Scheduler & Worker System**. Follow these 6 steps in order to demonstrate every required distributed systems capability live without ambiguity.

---

## Prerequisites & Environment
- **Dashboard URL**: `http://localhost:5173`
- **API Server**: `http://localhost:4000`
- **Redis Broker**: `localhost:6379`
- **Worker Cluster**: 3 independent BullMQ worker processes (`worker-1`, `worker-2`, `worker-3`)

---

## Step 1: Cluster Initialization & 5-Second Test
**Goal**: Verify cluster health, worker topology, and live telemetry connectivity.

1. Bring up the distributed stack:
   ```bash
   docker compose up --build -d
   ```
2. Open `http://localhost:5173` in a browser.
3. Observe the **5-Second Test** on the **System Overview** page:
   - **System Health Badge**: Displays `SYSTEM HEALTHY` 🟢 (derived from 3/3 active workers, zero stalled locks).
   - **Workers Online**: `3 / 3` nodes active.
   - **Topology Diagram**: `API Gateway (:4000)` ➔ `Redis Buffer (:6379)` ➔ `Worker-1, Worker-2, Worker-3`.
   - **Heartbeat Pulses**: Each worker node pulses every second in sync with real heartbeat data (`0.8s ago`).
   - **SSE Telemetry Status**: `LIVE TELEMETRY` beacon is active.

---

## Step 2: Delayed Scheduling Precision Test
**Goal**: Measure scheduling accuracy and prove that delayed tasks fire on time with an honest, displayed drift value.

1. In the dashboard top bar, click **Enqueue Job** (or send via curl):
   ```bash
   curl -X POST http://localhost:4000/api/jobs \
     -H "Content-Type: application/json" \
     -d '{"queue": "critical", "payload": {"workMs": 1500}, "delayMs": 4000, "priority": 1}'
   ```
2. In the dashboard:
   - Navigate to **Jobs** (or inspect the **Metrics** page).
   - The job displays `Scheduled Target` with countdown ticker.
3. Once the 4000ms delay elapses:
   - The job transitions immediately to `Active` and completes.
   - Click the job row to open the **Job Detail Drawer**.
   - Check the **Lifecycle Stepper**: observe the calculated precision delta:
     ```
     Scheduled: <time> | Started: <time> | Drift: +8ms [HIGH PRECISION]
     ```
   - On the **Metrics** page, point to the **Delayed Scheduling Precision** card. It aggregates delayed jobs only. Under normal local load, expect drift in the tens of milliseconds; use the displayed value rather than claiming a fixed tolerance.

---

## Step 3: Queue Starvation Prevention Under Heavy Load
**Goal**: Prove that low-priority (P10) jobs are not starved when high-priority tasks arrive, due to the **Priority Aging Anti-Starvation Mechanism**.

1. Run the load script to flood the `default` queue with low-priority tasks:
   ```bash
   docker compose exec api npm run loadtest
   ```
   *(This submits 100 P10 jobs followed by 1 VIP P1 job).*
2. Navigate to the **Metrics** page on the dashboard:
   - Observe **Maximum Queue Wait Duration by Priority Tier**:
     - `P1–P2 (Urgent)`: Dispatched immediately with near-zero wait.
     - `P7–P10 (Low)`: Wait time is strictly bounded.
   - Point to the **Anti-Starvation Boosts** counter:
     - The background aging loop scans waiting tasks every 3s.
     - Any task waiting >10s is progressively boosted (+1 priority level per 5s wait) towards P1.
     - The metric proves P10 tasks age up, gain execution locks, and complete without starvation.

---

## Step 4: Live Failover & Mid-Execution Crash Reassignment
**Goal**: Demonstrate node failure detection, lock recovery, and automatic task reassignment when a worker is killed mid-task.

1. Dispatch a long-running task to `default`:
   ```bash
   curl -X POST http://localhost:4000/api/jobs \
     -H "Content-Type: application/json" \
     -d '{"queue": "default", "payload": {"workMs": 15000, "task": "heavy-export"}, "priority": 1}'
   ```
2. On the **System Overview** page:
   - Observe which worker picks up the job (e.g., `Worker-1` lights up cyan with active task badge `#<id>`).
3. While the task is actively running, kill that worker container:
   ```bash
   docker compose kill worker-1
   ```
4. **Watch the live failover propagate through the console**:
   - **0–5s**: `Worker-1` heartbeat becomes stale and its topology state changes to `STALLED`.
   - **System Health**: Shifts from `HEALTHY` to `DEGRADED` (1 of 3 workers offline).
   - **6–9s**: BullMQ lock expires (`lockDuration: 6000ms`) and emits the stall/reassignment events.
   - **~10s**: `Worker-1` is marked `OFFLINE` after its missing heartbeat threshold.
   - **Failover Alert Banner**: An orange alert banner lights up across the top of the Overview:
     ```
     🚨 LIVE FAILOVER: Stalled Job Reassigned to Healthy Worker
     BullMQ recovered lock and reassigned task #<id> to surviving worker pickup.
     ```
   - **Surviving Worker**: `Worker-2` or `Worker-3` immediately picks up the task and completes it cleanly.

---

## Step 5: Dead Letter Queue (DLQ) & Idempotent Reprocessing
**Goal**: Prove fault isolation, failure tracking in the DLQ, and idempotent execution guarantees.

1. Enqueue a job with forced failure:
   ```bash
   curl -X POST http://localhost:4000/api/jobs \
     -H "Content-Type: application/json" \
     -d '{"queue": "critical", "payload": {"forceFailAttempts": 3, "noSimulatedFailures": true, "task": "faulty-mutation"}, "priority": 1}'
   ```
2. On the dashboard:
   - Navigate to **Dead Letter Queue (DLQ)**.
   - The task appears in the failed table with failure reason: `"forced demo failure"`.
   - Attempts: `3 of 3` (exhausted retries).
3. Click the **Reprocess** button:
   - The job is requeued into the active waiting queue and completes on its next execution, because the scripted forced failures were exhausted.
   - Toast alert: `Job Requeued — Task #<id> re-entered waiting queue`.
4. **Idempotency Guarantee**:
   - Every worker atomically claims the Redis lease `scheduler:idempotency:job:<id>:lock` before side effects, then writes the completed marker `scheduler:idempotency:job:<id>`.
   - If a completed job is redelivered or retried, side-effects are skipped:
     `{ idempotentSkip: true, note: 'Skipped side-effects: handler is idempotent' }`.
   - Framing: *"At-least-once delivery + Idempotent handlers = Effectively-once outcome."*

---

## Step 6: Cluster Restoration
**Goal**: Recover the killed worker and return the cluster to full health.

1. Restart the killed worker container:
   ```bash
   docker compose up -d worker-1
   ```
2. Within 2 seconds on the dashboard:
   - `Worker-1` reports online with fresh heartbeats.
   - Topology diagram updates to 3/3 active nodes.
   - System health badge returns to `SYSTEM HEALTHY` 🟢.
