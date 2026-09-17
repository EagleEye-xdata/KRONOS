import React from 'react';
import { 
  Activity, 
  ListFilter, 
  Layers, 
  Cpu, 
  AlertOctagon, 
  BarChart3, 
  Radio, 
  ShieldCheck,
  Server
} from 'lucide-react';
import { ConnectionIndicator } from '../ui/ConnectionIndicator';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'jobs', label: 'Jobs', icon: ListFilter },
  { id: 'queues', label: 'Queues', icon: Layers },
  { id: 'workers', label: 'Workers', icon: Cpu },
  { id: 'dlq', label: 'Dead Letter Queue', icon: AlertOctagon },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'events', label: 'Event Stream', icon: Radio },
];

export function Sidebar({
  activeView,
  onNavigate,
  workers = [],
  failedCount = 0,
  queueTotals,
  connectionStatus,
  reconnectAttempt,
  onManualReconnect
}) {
  const onlineWorkers = workers.filter(w => w.status === 'online').length;
  const pendingJobs = queueTotals ? (queueTotals.waiting + queueTotals.active) : 0;

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {/* Top: Identity & Brand */}
      <div>
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '5px',
              background: 'linear-gradient(135deg, var(--accent), #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Activity size={15} color="#fff" strokeWidth={2.5} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                KRONOS
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>
                v2.0
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Distributed Scheduler
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            let badge = null;
            if (item.id === 'workers') {
              badge = (
                <span
                  className="font-mono"
                  style={{
                    fontSize: '10px',
                    color: onlineWorkers > 0 ? '#10b981' : '#ef4444',
                    background: onlineWorkers > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}
                >
                  {onlineWorkers}/{workers.length}
                </span>
              );
            } else if (item.id === 'dlq' && failedCount > 0) {
              badge = (
                <span
                  className="font-mono"
                  style={{
                    fontSize: '10px',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.15)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}
                >
                  {failedCount}
                </span>
              );
            } else if (item.id === 'jobs' && pendingJobs > 0) {
              badge = (
                <span
                  className="font-mono"
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}
                >
                  {pendingJobs}
                </span>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.1s ease',
                  textAlign: 'left',
                  width: '100%'
                }}
                className={isActive ? '' : 'hover-subtle'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Icon
                    size={15}
                    color={isActive ? 'var(--accent)' : 'var(--text-tertiary)'}
                  />
                  <span>{item.label}</span>
                </div>
                {badge}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Persistent Bottom Footer: Connection & Backend Status */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <ConnectionIndicator
          status={connectionStatus}
          reconnectAttempt={reconnectAttempt}
          onManualReconnect={onManualReconnect}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Server size={11} />
            <span className="font-mono">API :4000</span>
          </div>
          <span className="font-mono">Redis :6379</span>
        </div>
      </div>
    </aside>
  );
}
