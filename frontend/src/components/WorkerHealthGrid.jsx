import React, { useState, useEffect } from 'react';
import { Cpu, Skull, CheckCircle2, AlertOctagon, Terminal, Server, Flame } from 'lucide-react';

export function WorkerHealthGrid({ workers = [], onKillWorker, killingIds = new Set() }) {
  const [now, setNow] = useState(Date.now());

  // Real-time ticking relative clock (updates every 200ms for smooth "Ns ago" display)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Cpu size={14} />
          <span>Worker Cluster Health Grid (Failover Demo)</span>
        </div>
        <div className="font-mono" style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
          {workers.filter(w => w.status === 'online').length} ONLINE // {workers.length} REGISTERED
        </div>
      </div>

      <div className="panel-body" style={{ padding: '10px' }}>
        {workers.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-dim)',
            gap: '8px'
          }}>
            <Server size={28} />
            <div className="font-mono" style={{ fontSize: '12px' }}>NO ACTIVE WORKERS CONNECTED</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Launch workers via API or click "+ Scale Worker" above</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '10px'
          }}>
            {workers.map(worker => {
              const isKilling = killingIds.has(worker.id);
              const isOffline = worker.status === 'offline' || isKilling;
              const isStalled = worker.status === 'stalled';
              const isOnline = worker.status === 'online' && !isKilling;

              // Calculate relative heartbeat age
              let heartbeatAgeStr = 'NEVER';
              let heartbeatAgeSec = 999;
              if (worker.lastHeartbeat) {
                heartbeatAgeSec = Math.max(0, (now - worker.lastHeartbeat) / 1000);
                heartbeatAgeStr = `${heartbeatAgeSec.toFixed(1)}s ago`;
              }

              return (
                <div
                  key={worker.id}
                  className={`worker-card ${
                    isKilling ? 'is-killed is-offline' :
                    isOffline ? 'is-offline' :
                    isStalled ? 'is-stalled' : 'is-online'
                  }`}
                  style={{
                    boxShadow: isKilling ? '0 0 20px rgba(239, 68, 68, 0.4)' : undefined
                  }}
                >
                  {/* Card Header: ID & Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        background: isOffline ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Cpu size={13} color={isOffline ? '#f87171' : 'var(--color-cyan)'} />
                      </div>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em' }}>
                        WORKER-{worker.id}
                      </span>
                    </div>

                    <div className={`status-pill ${
                      isKilling || isOffline ? 'status-offline' :
                      isStalled ? 'status-stalled' : 'status-online'
                    }`}>
                      <span className="beacon-dot" />
                      <span>{isKilling ? 'TERMINATING' : isOffline ? 'OFFLINE' : isStalled ? 'STALLED' : 'ONLINE'}</span>
                    </div>
                  </div>

                  {/* Metadata Row: PID / Host / Queues */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '10px',
                    color: 'var(--color-text-dim)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {worker.pid && <span>PID: {worker.pid}</span>}
                    {worker.hostname && <span>HOST: {worker.hostname.slice(0, 10)}</span>}
                    {worker.queues && worker.queues.length > 0 && (
                      <span title={worker.queues.join(', ')}>
                        Q: {worker.queues.length}
                      </span>
                    )}
                  </div>

                  {/* Current Active Job Banner */}
                  <div style={{
                    background: worker.currentJobId ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0,0,0,0.35)',
                    border: `1px solid ${worker.currentJobId ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '4px',
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '32px'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      Current Task:
                    </span>
                    {worker.currentJobId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Flame size={12} color="#fbbf24" className="spin-slow" />
                        <span className="font-mono" style={{
                          fontSize: '11px',
                          color: '#fbbf24',
                          fontWeight: 700,
                          maxWidth: '130px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={worker.currentJobId}>
                          #{worker.currentJobId.slice(0, 8)}...
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono" style={{ fontSize: '10px', color: '#64748b' }}>
                        IDLE (STANDBY)
                      </span>
                    )}
                  </div>

                  {/* Live Telemetry: Heartbeat & Processed count */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    marginTop: '2px'
                  }}>
                    {/* Live Ticking Heartbeat */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
                        Heartbeat
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontWeight: 600,
                          color: heartbeatAgeSec > 4.5 ? '#f87171' : heartbeatAgeSec > 2.5 ? '#fbbf24' : '#34d399'
                        }}
                      >
                        {heartbeatAgeStr}
                      </span>
                    </div>

                    {/* Jobs Processed Count */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
                        Processed
                      </span>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                        {worker.processedCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Failover Centerpiece: Kill Worker Button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: '4px',
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <button
                      className="btn-kill"
                      disabled={isOffline || isKilling}
                      onClick={() => onKillWorker(worker.id)}
                      title="Trigger worker termination to test failover"
                    >
                      <Skull size={11} />
                      <span>{isKilling ? 'KILLING...' : isOffline ? 'DEAD' : 'KILL WORKER'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
