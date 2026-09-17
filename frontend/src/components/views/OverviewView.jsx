import React from 'react';
import { 
  Cpu, 
  Layers, 
  Activity, 
  AlertOctagon, 
  Zap, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Flame,
  Radio
} from 'lucide-react';
import { MetricTile } from '../ui/MetricTile';
import { TopologyDiagram } from '../ui/TopologyDiagram';
import { QueueDepthChart } from '../QueueDepthChart';
import { StatusBadge } from '../ui/StatusBadge';

export function OverviewView({
  workers = [],
  queues = [],
  metrics,
  depthHistory = [],
  events = [],
  onNavigate,
  onSelectWorker,
  systemHealth
}) {
  const onlineWorkers = workers.filter(w => w.status === 'online').length;
  const totalWorkers = workers.length;

  let totalWaiting = 0;
  let totalActive = 0;
  let totalDelayed = 0;
  let totalCompleted = 0;
  let totalFailed = 0;

  queues.forEach(q => {
    totalWaiting += q.counts?.waiting || 0;
    totalActive += q.counts?.active || 0;
    totalDelayed += q.counts?.delayed || 0;
    totalCompleted += q.counts?.completed || 0;
    totalFailed += q.counts?.failed || 0;
  });

  const throughput = metrics?.throughput ?? 0;
  const avgLatency = metrics?.avgLatency ?? 0;
  const stalledCount = metrics?.stalledCount ?? 0;

  // Detect active or recent failover events (within last 30s)
  const recentFailover = events.find(e => 
    (e.type === 'job:reassigned' || e.type === 'job:stalled' || e.type === 'worker:down') &&
    (Date.now() - new Date(e.timestamp).getTime() < 30000)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Live Failover In-Progress Banner (Centerpiece of Failover Demo) */}
      {recentFailover && (
        <div
          style={{
            background: recentFailover.type === 'job:reassigned' ? 'rgba(249, 115, 22, 0.18)' : 'rgba(239, 68, 68, 0.18)',
            border: `1px solid ${recentFailover.type === 'job:reassigned' ? '#fb923c' : '#ef4444'}`,
            borderRadius: '6px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.25)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: recentFailover.type === 'job:reassigned' ? '#fb923c' : '#ef4444',
                animation: 'statusPulse 1s infinite ease-in-out'
              }}
            />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: recentFailover.type === 'job:reassigned' ? '#fb923c' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {recentFailover.type === 'job:reassigned' ? 'LIVE FAILOVER: Stalled Job Reassigned to Healthy Worker' :
                 recentFailover.type === 'job:stalled' ? 'FAILOVER DETECTED: Task Lock Expired (Stalled)' :
                 'CRITICAL: Worker Failure Detected'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {recentFailover.type === 'job:reassigned'
                  ? `BullMQ recovered lock and reassigned task #${recentFailover.data?.id?.slice(0, 8)} back to waiting queue for surviving worker pickup.`
                  : `Worker termination detected. BullMQ stall supervisor active; failover completing in ~6-9s.`}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('events')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              padding: '4px 10px',
              cursor: 'pointer'
            }}
          >
            Inspect Event Log
          </button>
        </div>
      )}
      {/* 5-Second Test Compact KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px'
        }}
      >
        <MetricTile
          label="Workers Online"
          value={`${onlineWorkers} / ${totalWorkers}`}
          status={onlineWorkers === totalWorkers && totalWorkers > 0 ? 'healthy' : onlineWorkers === 0 ? 'critical' : 'warning'}
          icon={Cpu}
          subtext={onlineWorkers === totalWorkers ? 'All nodes reporting' : `${totalWorkers - onlineWorkers} offline`}
          onClick={() => onNavigate('workers')}
        />

        <MetricTile
          label="Queued / Waiting"
          value={totalWaiting + totalDelayed}
          unit={totalDelayed > 0 ? `(${totalDelayed} delayed)` : undefined}
          status={totalWaiting > 50 ? 'warning' : 'default'}
          icon={Layers}
          subtext="Pending worker pickup"
          onClick={() => onNavigate('queues')}
        />

        <MetricTile
          label="Actively Processing"
          value={totalActive}
          status={totalActive > 0 ? 'active' : 'default'}
          icon={Activity}
          subtext={`${totalActive} locks held by cluster`}
          onClick={() => onNavigate('jobs')}
        />

        <MetricTile
          label="Live Throughput"
          value={throughput}
          unit="jobs/min"
          status={throughput > 0 ? 'healthy' : 'default'}
          icon={Zap}
          subtext="Last 60s completed"
          onClick={() => onNavigate('metrics')}
        />

        <MetricTile
          label="Avg Latency"
          value={avgLatency}
          unit="ms"
          status="default"
          icon={Clock}
          subtext="Execution duration"
          onClick={() => onNavigate('metrics')}
        />

        <MetricTile
          label="Failed / DLQ"
          value={totalFailed}
          status={totalFailed > 0 ? 'critical' : 'healthy'}
          icon={AlertOctagon}
          subtext={totalFailed > 0 ? 'Requires attention' : 'Dead letter queue clear'}
          onClick={() => onNavigate('dlq')}
        />
      </div>

      {/* Flagship Element: Live Topology Diagram */}
      <TopologyDiagram
        workers={workers}
        queueTotals={{ waiting: totalWaiting, active: totalActive, delayed: totalDelayed }}
        throughput={throughput}
        onSelectWorker={onSelectWorker}
      />

      {/* Two Column Grid: Queue Depth Timeline & Real-Time Operational Stream */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '12px',
          minHeight: '340px'
        }}
      >
        {/* Left: Queue Depth Telemetry Chart */}
        <div style={{ height: '340px' }}>
          <QueueDepthChart history={depthHistory} queues={queues} />
        </div>

        {/* Right: Operational Stream with Failover Callout */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '340px'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={14} color="var(--accent)" />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                Live Operational Event Feed
              </span>
            </div>
            <button
              onClick={() => onNavigate('events')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Full Stream</span>
              <ArrowRight size={11} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px'
            }}
          >
            {events.slice(0, 30).map(evt => {
              const isFailover = evt.type === 'job:reassigned' || evt.type === 'job:stalled';
              const isWorkerDown = evt.type === 'worker:down';
              const isFailed = evt.type === 'job:failed';

              let timeStr = '';
              if (evt.timestamp) {
                const d = new Date(evt.timestamp);
                timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
              }

              return (
                <div
                  key={evt.id}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: isFailover ? 'rgba(249, 115, 22, 0.15)' :
                                isWorkerDown ? 'rgba(239, 68, 68, 0.15)' :
                                isFailed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: isFailover ? '1px solid rgba(249, 115, 22, 0.4)' :
                            isWorkerDown ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{timeStr}</span>
                    <StatusBadge
                      status={
                        evt.type === 'job:completed' ? 'completed' :
                        evt.type === 'job:active' ? 'active' :
                        evt.type === 'job:failed' ? 'failed' :
                        evt.type === 'job:added' ? 'waiting' :
                        evt.type === 'worker:down' ? 'offline' : 'idle'
                      }
                      labelOverride={evt.type.replace('job:', '').replace('worker:', 'W-')}
                    />
                    <span
                      style={{
                        color: isFailover ? '#fb923c' : isWorkerDown ? '#f87171' : 'var(--text-primary)',
                        fontWeight: isFailover || isWorkerDown ? 700 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {isFailover ? `FAILOVER REASSIGNMENT: Job #${evt.data?.id?.slice(0, 8)} returned to queue` :
                       isWorkerDown ? `CRITICAL: Worker #${evt.data?.id} failed (${evt.data?.reason || 'heartbeat timeout'})` :
                       evt.type.startsWith('job:') ? `[/${evt.data?.queue || 'task'}] #${evt.data?.id?.slice(0, 8) || ''}` :
                       JSON.stringify(evt.data).slice(0, 50)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
