// REST client for Distributed Task Scheduler API

const API_BASE = '/api';

export async function fetchQueues() {
  const res = await fetch(`${API_BASE}/queues`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch queues`);
  return res.json();
}

export async function fetchWorkers() {
  const res = await fetch(`${API_BASE}/workers`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch workers`);
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch metrics`);
  return res.json();
}

export async function fetchJobs({ status = '', queue = '', limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (queue) params.set('queue', queue);
  if (limit) params.set('limit', String(limit));
  
  const res = await fetch(`${API_BASE}/jobs?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch jobs`);
  return res.json();
}

export async function fetchJob(id) {
  const res = await fetch(`${API_BASE}/jobs/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch job ${id}`);
  return res.json();
}

export async function enqueueJob({ queue, payload = {}, delayMs = 0, priority = 5, cron = null }) {
  const body = {
    queue,
    payload,
    delayMs: Number(delayMs) || 0,
    priority: Number(priority) || 5,
  };
  if (cron) body.cron = cron;

  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to enqueue job`);
  }
  return res.json();
}

export async function retryJob(id) {
  const res = await fetch(`${API_BASE}/jobs/${id}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to retry job`);
  }
  return res.json();
}

export async function killWorker(id) {
  const res = await fetch(`${API_BASE}/workers/${id}/kill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  // In Docker mode workers live in another container, so the API returns a
  // safe, actionable 409 instead of attempting to signal a container-local PID.
  if (!res.ok && res.status !== 409) throw new Error(body.error || `HTTP ${res.status}: Failed to kill worker`);
  return body;
}

export async function spawnWorker(id = null) {
  const res = await fetch(`${API_BASE}/workers/spawn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(id ? { id } : {}),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to spawn worker`);
  }
  return res.json();
}
