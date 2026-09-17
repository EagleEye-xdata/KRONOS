import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Skull, 
  Flame, 
  Copy, 
  Check, 
  AlertTriangle, 
  Plus, 
  Terminal,
  Server
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export function WorkersView({
  workers = [],
  onKillWorker,
  onSpawnWorker,
  isSpawning,
  killingIds = new Set()
}) {
  const [now, setNow] = useState(Date.now());
  const [dockerFallbackModal, setDockerFallbackModal] = useState(null); // { id, command }
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Real-time ticking relative clock
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  const handleKill = async (worker) => {
    try {
      const res = await onKillWorker(worker.id);
      // If the kill endpoint returned a note about container execution:
      if (res && res.note && res.note.includes('docker compose')) {
        setDockerFallbackModal({
          id: worker.id,
          command: `docker compose kill worker-${worker.id}`,
          note: res.note
        });
      }
    } catch (err) {
      if (err.message && err.message.includes('docker compose')) {
        setDockerFallbackModal({
          id: worker.id,
          command: `docker compose kill worker-${worker.id}`,
          note: err.message
        });
      }
    }
  };

  const copyCommand = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Controls: Cluster stats & Spawn action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Active Cluster: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{workers.filter(w => w.status === 'online').length}</span> of {workers.length} nodes online
        </div>

        <button
          onClick={onSpawnWorker}
          disabled={isSpawning}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          className="hover-elevate"
        >
          <Plus size={13} />
          <span>{isSpawning ? 'Spawning Child Node...' : 'Spawn Worker Node'}</span>
        </button>
      </div>

      {/* Grid of Workers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {workers.map(worker => {
          const isKilling = killingIds.has(worker.id);
          const isOffline = worker.status === 'offline' || isKilling;
          const isStalled = worker.status === 'stalled';
          const isOnline = worker.status === 'online' && !isKilling;

          let heartbeatAgeSec = 999;
          if (worker.lastHeartbeat) {
            heartbeatAgeSec = Math.max(0, (now - worker.lastHeartbeat) / 1000);
          }

          // Heartbeat pulse rule: STRICTLY stops if stale (>4.5s) or offline
          const shouldPulse = isOnline && heartbeatAgeSec <= 4.5;

          return (
            <div
              key={worker.id}
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid ${isOffline ? 'rgba(239, 68, 68, 0.35)' : isStalled ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
              className="hover-elevate"
            >
              {/* Card Header: Node ID & Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '5px',
                      background: isOffline ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Cpu size={14} color={isOffline ? '#f87171' : '#10b981'} />
                  </div>
                  <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Worker-{worker.id}
                  </span>
                </div>

                <StatusBadge
                  status={isKilling ? 'critical' : worker.status}
                  labelOverride={isKilling ? 'Terminating' : undefined}
                  pulse={shouldPulse}
                />
              </div>

              {/* Host & Process Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {worker.pid && <span>PID: {worker.pid}</span>}
                {worker.hostname && <span>Host: {worker.hostname.slice(0, 12)}</span>}
                {worker.queues && <span>Queues: {worker.queues.length}</span>}
              </div>

              {/* Current Active Task Card */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '5px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '34px'
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Current Task
                </span>

                {worker.currentJobId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={12} color="#22d3ee" className="spin-slow" />
                    <span className="font-mono" style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 600 }}>
                      #{worker.currentJobId.slice(0, 8)}...
                    </span>
                  </div>
                ) : (
                  <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    IDLE (STANDBY)
                  </span>
                )}
              </div>

              {/* Heartbeat & Processed Telemetry */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Heartbeat</div>
                  <div
                    className="font-mono"
                    style={{
                      fontWeight: 600,
                      color: heartbeatAgeSec > 4.5 ? '#f87171' : heartbeatAgeSec > 2.5 ? '#fbbf24' : '#10b981'
                    }}
                  >
                    {worker.lastHeartbeat ? `${heartbeatAgeSec.toFixed(1)}s ago` : 'never'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tasks Finished</div>
                  <div className="font-mono tabular-nums" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {worker.processedCount || 0}
                  </div>
                </div>
              </div>

              {/* Failover Kill Action */}
              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                  API process signal control
                </span>

                <button
                  onClick={() => handleKill(worker)}
                  disabled={isOffline || isKilling}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '4px',
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    padding: '4px 8px',
                    cursor: isOffline || isKilling ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: isOffline || isKilling ? 0.4 : 1
                  }}
                  title="Simulate worker crash to test failover reassignment"
                >
                  <Skull size={11} />
                  <span>{isKilling ? 'Killing...' : isOffline ? 'Offline' : 'Kill Worker'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Docker Compose Fallback Modal (surfacing exact backend behavior honestly) */}
      {dockerFallbackModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setDockerFallbackModal(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.7)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '8px' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Containerized Worker Detected</span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Worker-{dockerFallbackModal.id} is isolated inside a Docker container. The API process cannot send direct OS kill signals to other container namespaces. Run the following command in your terminal to simulate the crash:
            </p>

            <div
              style={{
                background: '#05080e',
                border: '1px solid var(--border-subtle)',
                borderRadius: '5px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--accent)',
                marginBottom: '16px'
              }}
            >
              <code>{dockerFallbackModal.command}</code>
              <button
                onClick={() => copyCommand(dockerFallbackModal.command)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copiedCmd ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span style={{ fontSize: '10px' }}>{copiedCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDockerFallbackModal(null)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  padding: '5px 12px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
