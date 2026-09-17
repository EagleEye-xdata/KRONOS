# Distributed Task Scheduler & Worker System

A demo-ready distributed task scheduler with a live React dashboard. The backend uses Express, BullMQ, and Redis; three independent workers process work with priority scheduling, retries, delayed execution, atomic idempotency leases, heartbeats, failover telemetry, and Server-Sent Events (SSE).

## Architecture

```
React dashboard (:5173) -> Express API (:4000) -> Redis -> BullMQ workers (1, 2, 3)
                              ^                    |
                              +---- SSE events -----+
```

The dashboard reads REST data from `http://localhost:4000/api` and receives live changes from `http://localhost:4000/api/stream`.

## Prerequisites

- Docker Desktop (running)
- Node.js 18 or newer (for the local frontend)

## Start the complete project

### 1. Start backend services

From the project root:

```powershell
docker compose up --build -d
```

This starts Redis, the API, and three dedicated worker containers. Confirm their status:

```powershell
docker compose ps
```

The API health check is available at [http://localhost:4000/health](http://localhost:4000/health).

### 2. Start the dashboard

Open a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dashboard automatically connects to the API on port 4000.

### Stop services

```powershell
docker compose down
```

To also remove Redis demo data, use `docker compose down -v`.

## Local backend development (without Compose)

Use this only if you already have Redis running and have set `REDIS_URL` in `.env`.

```powershell
npm ci
npm run api
npm run worker -- --id=1
npm run worker -- --id=2
npm run worker -- --id=3
```

## API

All API routes allow CORS for the dashboard.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/jobs` | Create a job: `{ queue, payload, delayMs?, priority?, cron? }` |
| `GET` | `/api/jobs?status=&queue=&limit=` | List jobs; `status=failed` is the DLQ view |
| `GET` | `/api/jobs/:id` | Get job detail and scheduling timing |
| `POST` | `/api/jobs/:id/retry` | Requeue a failed job |
| `GET` | `/api/queues` | Queue depth and lifecycle counts |
| `GET` | `/api/workers` | Worker status and heartbeat data |
| `POST` | `/api/workers/:id/kill` | Kill a locally spawned worker process |
| `GET` | `/api/metrics` | Depth history, throughput, latency, stalled count, and priority wait time |
| `GET` | `/api/stream` | SSE stream with `{ type, timestamp, data }` events |

Priority uses BullMQ semantics: lower number means higher priority (`1` is more urgent than `10`). Jobs retain their original priority band for metrics even when priority aging boosts their effective priority. Job IDs are globally unique across queues.

## Delivery and fairness guarantees

- **At-least-once delivery:** BullMQ retries failed work three times with exponential backoff and reassigns stalled work.
- **Effectively-once outcomes:** workers acquire an atomic Redis `SET NX` execution lease before side effects and retain a 24-hour completed-result marker. A redelivery waits for the lease or returns the completed result instead of repeating side effects.
- **Priority aging:** every three seconds, the API scans up to 1,000 waiting jobs per queue. Work waiting longer than 10 seconds is boosted one priority tier every five seconds. `/api/metrics` exposes the aging boost count and maximum wait by original priority band.
- **Scheduling precision:** each delayed job exposes its intended `scheduledFor`, actual `processedAt`, and `schedulingDeltaMs`. Aggregate precision metrics intentionally include delayed jobs only; immediate-job queue wait is not misreported as scheduler drift.

## Demo commands

Seed immediate, priority, delayed, and forced-failure jobs:

```powershell
docker compose exec api npm run seed
```

Flood the default queue with low-priority work, then inject a high-priority task:

```powershell
docker compose exec api npm run loadtest
```

### Live failover

1. Create a long job from the dashboard or API, for example `payload.workMs: 15000`.
2. Check `/api/workers` to identify its worker.
3. In Compose mode, kill that worker container:

   ```powershell
   docker compose kill worker-1
   ```

4. Around 6-9 seconds after the kill, BullMQ detects the expired lock and emits `job:stalled` and `job:reassigned`; the dashboard marks the stale worker offline by about 10 seconds. A healthy worker then completes the reassigned job.
5. Restore the demo worker when finished:

   ```powershell
   docker compose start worker-1
   ```

`POST /api/workers/:id/kill` is intentionally limited to workers launched by the API on the same host. Compose worker PIDs are container-local, so the endpoint safely returns the corresponding `docker compose kill` command instead.

## SSE event types

The stream includes `job:added`, `job:active`, `job:completed`, `job:failed`, `job:stalled`, `job:reassigned`, `worker:heartbeat`, `worker:down`, and `queue:depth`. Heartbeats and queue depth are emitted about once per second even when no jobs are running.

## Project layout

```
api/                 Express API, route handlers, SSE broadcaster
worker/              Standalone BullMQ worker process
scripts/             Seed and load-test scripts
frontend/            React + Vite real-time dashboard
Dockerfile           Shared API/worker image
docker-compose.yml   Redis, API, and three worker services
```
