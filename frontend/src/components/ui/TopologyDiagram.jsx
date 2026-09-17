import React, { useState, useEffect } from 'react';
import { Server, Database, Cpu, ArrowRight, Activity, Flame, ShieldAlert } from 'lucide-react';

export function TopologyDiagram({ workers = [], queueTotals, throughput = 0, onSelectWorker }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const totalQueued = queueTotals ? (queueTotals.waiting + queueTotals.delayed) : 0;
  const totalActive = queueTotals ? queueTotals.active : 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} color="var(--accent)" />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Distributed Architecture & Live Execution Topology
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
          {workers.filter(w => w.status === 'online').length} of {workers.length} nodes connected
        </span>
      </div>

      {/* Main Diagram Flow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '200px 80px 220px 80px 1fr',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 0'
        }}
      >
        {/* Node 1: API Gateway */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              API Gateway
            </span>
            <span className="font-mono" style={{ fontSize: '9px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '1px 5px', borderRadius: '3px' }}>
              :4000
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Express Controller</div>
              <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {throughput} req/min
              </div>
            </div>
          </div>
        </div>

        {/* Connector 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, var(--border-default), var(--accent))', position: 'relative' }}>
            {throughput > 0 && (
              <span className="flow-dot" style={{ position: 'absolute', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
            )}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>publish</span>
        </div>

        {/* Node 2: Redis / BullMQ Buffer */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Redis + BullMQ
            </span>
            <span className="font-mono" style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1px 5px', borderRadius: '3px' }}>
              :6379
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#f87171" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Priority Buffer</div>
              <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                <span style={{ color: '#60a5fa' }}>{totalQueued} queued</span> • <span style={{ color: '#22d3ee' }}>{totalActive} active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connector 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, #f87171, #10b981)', position: 'relative' }}>
            {totalActive > 0 && (
              <span className="flow-dot" style={{ position: 'absolute', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            )}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>lock &amp; poll</span>
        </div>

        {/* Node 3: Worker Nodes Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {workers.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', border: '1px dashed var(--border-subtle)', borderRadius: '6px' }}>
              No worker processes connected
            </div>
          ) : (
            workers.map(worker => {
              const isOnline = worker.status === 'online';
              const isStalled = worker.status === 'stalled';
              const isOffline = worker.status === 'offline';
              const heartbeatAge = worker.lastHeartbeat ? Math.max(0, (now - worker.lastHeartbeat) / 1000) : 999;
              // STRICT RULE: Heartbeat animation MUST STOP if heartbeat data goes stale (>4.5s) or offline!
              const shouldPulseHeartbeat = isOnline && heartbeatAge <= 4.5;

              return (
                <div
                  key={worker.id}
                  onClick={() => onSelectWorker && onSelectWorker(worker)}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: `1px solid ${
                      isOffline ? 'rgba(239, 68, 68, 0.35)' :
                      isStalled ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'
                    }`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: onSelectWorker ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-elevate"
                >
                  {/* Left: Worker ID & Pulse */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isOffline ? '#ef4444' : isStalled ? '#f59e0b' : '#10b981',
                        boxShadow: shouldPulseHeartbeat ? '0 0 8px #10b981' : 'none',
                        animation: shouldPulseHeartbeat ? 'statusPulse 2s infinite ease-in-out' : 'none'
                      }}
                      title={shouldPulseHeartbeat ? 'Heartbeat active' : 'Heartbeat stalled or offline'}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Worker-{worker.id}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {worker.lastHeartbeat ? `${heartbeatAge.toFixed(1)}s ago` : 'no heartbeat'}
                      </span>
                    </div>
                  </div>

                  {/* Right: State & Current Task */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {worker.currentJobId ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(6, 182, 212, 0.12)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          color: '#22d3ee',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        <Flame size={11} color="#22d3ee" className="spin-slow" />
                        <span>#{worker.currentJobId.slice(0, 8)}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {isOffline ? 'OFFLINE' : isStalled ? 'STALLED' : 'IDLE'}
                      </span>
                    )}

                    <span
                      className="font-mono tabular-nums"
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}
                      title="Processed count"
                    >
                      {worker.processedCount || 0} done
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
