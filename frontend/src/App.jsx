import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewView } from './components/views/OverviewView';
import { JobsView } from './components/views/JobsView';
import { QueuesView } from './components/views/QueuesView';
import { WorkersView } from './components/views/WorkersView';
import { DLQView } from './components/views/DLQView';
import { MetricsView } from './components/views/MetricsView';
import { EventStreamView } from './components/views/EventStreamView';
import { EnqueueJobModal } from './components/EnqueueJobModal';
import { ToastContainer } from './components/ToastContainer';
import {
  fetchQueues,
  fetchWorkers,
  fetchMetrics,
  fetchJobs,
  killWorker,
  spawnWorker,
  retryJob,
  enqueueJob,
} from './api';
import { useEventStream } from './useEventStream';

export function App() {
  // Navigation State
  const [activeView, setActiveView] = useState('overview');
  const [jobsQueueFilter, setJobsQueueFilter] = useState('');

  // Primary Data State
  const [queues, setQueues] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [depthHistory, setDepthHistory] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEventStreamPaused, setIsEventStreamPaused] = useState(false);

  // Operational State
  const [killingIds, setKillingIds] = useState(new Set());
  const [isSpawning, setIsSpawning] = useState(false);
  const [isEnqueueOpen, setIsEnqueueOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast Dispatcher
  const addToast = useCallback((title, message = '', type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    setToasts(prev => [...prev.slice(-3), { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Initial Load & Refresh
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [queuesData, workersData, metricsData, jobsData] = await Promise.all([
        fetchQueues().catch(() => []),
        fetchWorkers().catch(() => []),
        fetchMetrics().catch(() => null),
        fetchJobs({ limit: 150 }).catch(() => [])
      ]);

      setQueues(queuesData);
      setWorkers(workersData);
      setJobs(jobsData);

      if (metricsData) {
        setMetrics(metricsData);
        if (Array.isArray(metricsData.queueDepthHistory)) {
          const normalized = metricsData.queueDepthHistory.map(item => {
            let waiting = 0, active = 0, delayed = 0, failed = 0, completed = 0;
            if (item.queues) {
              item.queues.forEach(q => {
                waiting += q.counts?.waiting || 0;
                active += q.counts?.active || 0;
                delayed += q.counts?.delayed || 0;
                failed += q.counts?.failed || 0;
                completed += q.counts?.completed || 0;
              });
            }
            return {
              timestamp: item.timestamp,
              total: item.total || (waiting + active + delayed),
              waiting,
              active,
              delayed,
              failed,
              completed
            };
          });
          setDepthHistory(normalized.slice(-60));
        }
      }
    } catch (err) {
      console.error('Error loading scheduler data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic metrics refresh (every 5 seconds) to ensure throughput & avg latency stay fresh
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const m = await fetchMetrics();
        if (m) setMetrics(m);
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Real-Time Event Dispatcher
  const handleEventReceived = useCallback((sseEvent) => {
    const { type, timestamp = new Date().toISOString(), data } = sseEvent;
    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Append to live blackbox event log (if not paused)
    if (!isEventStreamPaused) {
      setEvents(prev => [{ id: eventId, type, timestamp, data }, ...prev.slice(0, 199)]);
    }

    // Reconcile real-time state slices
    switch (type) {
      case 'queue:depth': {
        if (data) {
          let waiting = 0, active = 0, delayed = 0, failed = 0, completed = 0;
          if (Array.isArray(data.queues)) {
            setQueues(data.queues);
            data.queues.forEach(q => {
              waiting += q.counts?.waiting || 0;
              active += q.counts?.active || 0;
              delayed += q.counts?.delayed || 0;
              failed += q.counts?.failed || 0;
              completed += q.counts?.completed || 0;
            });
          }
          const point = {
            timestamp: data.timestamp || timestamp,
            total: data.total ?? (waiting + active + delayed),
            waiting,
            active,
            delayed,
            failed,
            completed
          };
          setDepthHistory(prev => [...prev.slice(-59), point]);
        }
        break;
      }

      case 'worker:heartbeat': {
        if (Array.isArray(data)) {
          setWorkers(data);
        } else if (data && data.id) {
          setWorkers(prev => {
            const idx = prev.findIndex(w => String(w.id) === String(data.id));
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...data };
              return updated;
            }
            return [...prev, data];
          });
        }
        break;
      }

      case 'worker:down': {
        const deadId = String(data?.id);
        setWorkers(prev => prev.map(w => String(w.id) === deadId ? { ...w, status: 'offline', currentJobId: null } : w));
        setKillingIds(prev => {
          const next = new Set(prev);
          next.delete(deadId);
          return next;
        });
        addToast(`Worker #${deadId} Down`, data?.reason || 'Heartbeat timeout - failover trigger', 'error');
        break;
      }

      case 'job:added': {
        if (data) {
          setJobs(prev => [data, ...prev.filter(j => j.id !== data.id)]);
        }
        break;
      }

      case 'job:active': {
        if (data) {
          setJobs(prev => prev.map(j => j.id === data.id ? { ...j, status: 'active', processedAt: data.processedAt } : j));
          if (data.workerId) {
            setWorkers(prev => prev.map(w => String(w.id) === String(data.workerId) ? { ...w, currentJobId: data.id } : w));
          }
        }
        break;
      }

      case 'job:completed': {
        if (data) {
          setJobs(prev => prev.map(j => j.id === data.id ? { ...j, status: 'completed', finishedOn: Date.now(), returnvalue: data.result } : j));
          if (data.workerId) {
            setWorkers(prev => prev.map(w => String(w.id) === String(data.workerId) ? { ...w, currentJobId: null, processedCount: (w.processedCount || 0) + 1 } : w));
          }
        }
        break;
      }

      case 'job:failed': {
        if (data) {
          setJobs(prev => prev.map(j => j.id === data.id ? { ...j, status: 'failed', failedReason: data.error, attemptsMade: data.attemptsMade } : j));
          addToast('Task Failed', `Job #${data.id?.slice(0, 8)}: ${data.error || 'Execution fault'}`, 'error');
        }
        break;
      }

      case 'job:stalled': {
        addToast('Task Stalled', `Job #${data?.id?.slice(0, 8)} in /${data?.queue} lock expired`, 'error');
        break;
      }

      case 'job:reassigned': {
        addToast('Failover Triggered', `Job #${data?.id?.slice(0, 8)} reassigned to active queue`, 'info');
        break;
      }

      default:
        break;
    }
  }, [isEventStreamPaused, addToast]);

  // Hook SSE Stream
  const { status: connectionStatus, reconnectAttempt, manualReconnect } = useEventStream(handleEventReceived);

  // Derived Aggregate Totals
  const queueTotals = useMemo(() => {
    let waiting = 0, active = 0, delayed = 0, completed = 0, failed = 0;
    queues.forEach(q => {
      waiting += q.counts?.waiting || 0;
      active += q.counts?.active || 0;
      delayed += q.counts?.delayed || 0;
      completed += q.counts?.completed || 0;
      failed += q.counts?.failed || 0;
    });
    return { waiting, active, delayed, completed, failed };
  }, [queues]);

  const failedJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'failed');
  }, [jobs]);

  // DERIVED SYSTEM HEALTH LOGIC (Transparent & Auditable):
  // 1. Critical: 0 workers online while queues have active/waiting jobs, OR failed jobs rate > 20%.
  // 2. Degraded: Any worker stalled (age > 4.5s) OR 1+ workers offline while others online OR stalledCount > 0.
  // 3. Healthy: All registered workers online with fresh heartbeats and 0 stalled tasks.
  const systemHealth = useMemo(() => {
    const onlineWorkers = workers.filter(w => w.status === 'online').length;
    const totalWorkers = workers.length;
    const pendingWork = queueTotals.waiting + queueTotals.active;
    const stalledCount = metrics?.stalledCount || workers.filter(w => w.status === 'stalled').length;

    if (totalWorkers > 0 && onlineWorkers === 0 && pendingWork > 0) {
      return { status: 'critical', reason: 'Zero worker nodes online while jobs are pending execution in queue.' };
    }

    if (totalWorkers > 0 && onlineWorkers < totalWorkers) {
      return { status: 'degraded', reason: `${totalWorkers - onlineWorkers} of ${totalWorkers} worker processes are offline or terminated.` };
    }

    if (stalledCount > 0) {
      return { status: 'degraded', reason: `${stalledCount} tasks stalled due to execution lock expiration.` };
    }

    return { status: 'healthy', reason: 'All cluster nodes active, fresh heartbeats, zero stalled jobs.' };
  }, [workers, queueTotals, metrics]);

  // Actions
  const handleKillWorker = async (id) => {
    const stringId = String(id);
    setKillingIds(prev => new Set(prev).add(stringId));
    // Immediate optimistic state update
    setWorkers(prev => prev.map(w => String(w.id) === stringId ? { ...w, status: 'offline', currentJobId: null } : w));

    try {
      const res = await killWorker(stringId);
      if (res.killed) {
        addToast('Worker Terminated', `Kill signal dispatched to Worker #${stringId}`, 'info');
      } else {
        addToast('Compose failover command', res.note || `Run docker compose kill worker-${stringId}`, 'info');
        setWorkers(prev => prev.map(w => String(w.id) === stringId ? { ...w, status: 'online' } : w));
        setKillingIds(prev => { const next = new Set(prev); next.delete(stringId); return next; });
      }
      return res;
    } catch (err) {
      // Revert optimistic update if API failed
      setWorkers(prev => prev.map(w => String(w.id) === stringId ? { ...w, status: 'online' } : w));
      setKillingIds(prev => {
        const next = new Set(prev);
        next.delete(stringId);
        return next;
      });
      throw err;
    }
  };

  const handleSpawnWorker = async () => {
    setIsSpawning(true);
    try {
      const record = await spawnWorker();
      addToast('Worker Spawned', `Worker #${record.id} (PID ${record.pid}) launched`, 'success');
      setTimeout(async () => {
        const updated = await fetchWorkers().catch(() => []);
        setWorkers(updated);
        setIsSpawning(false);
      }, 1500);
    } catch (err) {
      addToast('Spawn Failed', err.message, 'error');
      setIsSpawning(false);
    }
  };

  const handleRetryJob = async (id) => {
    const record = await retryJob(id);
    addToast('Job Requeued', `Job #${id.slice(0, 8)} re-entered waiting queue`, 'success');
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'waiting', failedReason: null } : j));
    return record;
  };

  const handleEnqueueJob = async (jobParams) => {
    const record = await enqueueJob(jobParams);
    addToast('Job Created', `Job #${record.id.slice(0, 8)} queued in /${jobParams.queue}`, 'success');
    setJobs(prev => [record, ...prev]);
    return record;
  };

  const handleNavigateToJobs = (queueName) => {
    setJobsQueueFilter(queueName);
    setActiveView('jobs');
  };

  return (
    <div className="app-shell">
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={(viewId) => {
          if (viewId === 'jobs') setJobsQueueFilter('');
          setActiveView(viewId);
        }}
        workers={workers}
        failedCount={failedJobs.length}
        queueTotals={queueTotals}
        connectionStatus={connectionStatus}
        reconnectAttempt={reconnectAttempt}
        onManualReconnect={manualReconnect}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        {/* Top Bar */}
        <TopBar
          activeView={activeView}
          systemHealth={systemHealth}
          onOpenEnqueue={() => setIsEnqueueOpen(true)}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
        />

        {/* Content View Container */}
        <main className="content-container">
          {activeView === 'overview' && (
            <OverviewView
              workers={workers}
              queues={queues}
              metrics={metrics}
              depthHistory={depthHistory}
              events={events}
              onNavigate={setActiveView}
              onSelectWorker={() => setActiveView('workers')}
              systemHealth={systemHealth}
            />
          )}

          {activeView === 'jobs' && (
            <JobsView
              jobs={jobs}
              queues={queues}
              onRetryJob={handleRetryJob}
              onRefresh={loadData}
              isRefreshing={isRefreshing}
              initialQueueFilter={jobsQueueFilter}
            />
          )}

          {activeView === 'queues' && (
            <QueuesView
              queues={queues}
              onNavigateToJobs={handleNavigateToJobs}
            />
          )}

          {activeView === 'workers' && (
            <WorkersView
              workers={workers}
              onKillWorker={handleKillWorker}
              onSpawnWorker={handleSpawnWorker}
              isSpawning={isSpawning}
              killingIds={killingIds}
            />
          )}

          {activeView === 'dlq' && (
            <DLQView
              failedJobs={failedJobs}
              onRetryJob={handleRetryJob}
              onRefresh={loadData}
              isRefreshing={isRefreshing}
            />
          )}

          {activeView === 'metrics' && (
            <MetricsView
              metrics={metrics}
              depthHistory={depthHistory}
              queues={queues}
            />
          )}

          {activeView === 'events' && (
            <EventStreamView
              events={events}
              onClearEvents={() => setEvents([])}
              isPaused={isEventStreamPaused}
              onTogglePause={() => setIsEventStreamPaused(p => !p)}
            />
          )}
        </main>
      </div>

      {/* Enqueue Modal Console */}
      <EnqueueJobModal
        isOpen={isEnqueueOpen}
        onClose={() => setIsEnqueueOpen(false)}
        onEnqueue={handleEnqueueJob}
        queues={queues}
      />

      {/* Toast Alert Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
