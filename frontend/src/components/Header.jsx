import React from 'react';
import { 
  Activity, 
  Cpu, 
  Layers, 
  Clock, 
  AlertTriangle, 
  Zap, 
  PlusCircle, 
  RefreshCw,
  Radio
} from 'lucide-react';

export function Header({
  connectionStatus,
  reconnectAttempt,
  onManualReconnect,
  metrics,
  workers,
  queueTotals,
  onOpenEnqueue,
  onSpawnWorker,
  isSpawning
}) {
  const onlineWorkers = workers.filter(w => w.status === 'online').length;
  const totalWorkers = workers.length;
  const totalStalled = metrics?.stalledCount || workers.filter(w => w.status === 'stalled').length;
  const throughput = metrics?.throughput ?? 0;
  const avgLatency = metrics?.avgLatency ?? 0;
  const totalQueueDepth = queueTotals ? (queueTotals.waiting + queueTotals.active + queueTotals.delayed) : 0;

  return (
    <header style={{
      background: 'rgba(10, 14, 24, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      {/* Brand & Telemetry Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)'
          }}>
            <Activity size={16} color="#050a14" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="font-display" style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>
                KRONOS
              </span>
              <span className="font-mono" style={{ fontSize: '10px', color: 'var(--color-cyan)', background: 'rgba(0, 240, 255, 0.1)', padding: '1px 5px', borderRadius: '3px' }}>
                v2.4-RT
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Distributed Scheduler Mission Control
            </div>
          </div>
        </div>

        {/* SSE Status Beacon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div className={`status-pill ${
            connectionStatus === 'connected' ? 'status-online' : 
            connectionStatus === 'reconnecting' ? 'status-stalled' : 'status-offline'
          }`} style={{ padding: '2px 6px', fontSize: '9px' }}>
            <span className="beacon-dot" />
            <span>
              {connectionStatus === 'connected' ? 'STREAM LIVE' : 
               connectionStatus === 'reconnecting' ? `RECONNECTING (${reconnectAttempt})` : 'OFFLINE'}
            </span>
          </div>

          {connectionStatus !== 'connected' && (
            <button
              onClick={onManualReconnect}
              title="Force reconnect SSE telemetry"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-cyan)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <RefreshCw size={12} className={connectionStatus === 'reconnecting' ? 'spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stat Tiles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Active Workers */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '6px',
          padding: '4px 12px',
          minWidth: '110px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
            <Cpu size={12} color="#34d399" />
            <span>WORKERS</span>
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: onlineWorkers > 0 ? '#34d399' : '#f87171' }}>
            {onlineWorkers} <span style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontWeight: 400 }}>/ {totalWorkers}</span>
          </div>
        </div>

        {/* Global Queue Depth */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '6px',
          padding: '4px 12px',
          minWidth: '110px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
            <Layers size={12} color="#38bdf8" />
            <span>QUEUE DEPTH</span>
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
            {totalQueueDepth}
          </div>
        </div>

        {/* Throughput */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '6px',
          padding: '4px 12px',
          minWidth: '110px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
            <Zap size={12} color="#fbbf24" />
            <span>THROUGHPUT</span>
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
            {throughput} <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', fontWeight: 400 }}>jobs/min</span>
          </div>
        </div>

        {/* Avg Latency */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '6px',
          padding: '4px 12px',
          minWidth: '110px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
            <Clock size={12} color="#a78bfa" />
            <span>AVG LATENCY</span>
          </div>
          <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: '#a78bfa' }}>
            {avgLatency} <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', fontWeight: 400 }}>ms</span>
          </div>
        </div>

        {/* Stalled Count */}
        {totalStalled > 0 && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '6px',
            padding: '4px 12px',
            minWidth: '100px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#fbbf24' }}>
              <AlertTriangle size={12} />
              <span>STALLED</span>
            </div>
            <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
              {totalStalled}
            </div>
          </div>
        )}
      </div>

      {/* Control Plane Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn-secondary"
          onClick={onSpawnWorker}
          disabled={isSpawning}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px' }}
          title="Scale up by spawning a new worker instance"
        >
          <Cpu size={13} color="var(--color-cyan)" />
          <span>{isSpawning ? 'SPAWNING...' : '+ SCALE WORKER'}</span>
        </button>

        <button
          className="btn-primary"
          onClick={onOpenEnqueue}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <PlusCircle size={14} />
          <span>DISPATCH JOB</span>
        </button>
      </div>
    </header>
  );
}
