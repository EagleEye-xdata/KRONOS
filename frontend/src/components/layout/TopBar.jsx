import React, { useState } from 'react';
import { Plus, RefreshCw, HelpCircle, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

const VIEW_TITLES = {
  overview: { title: 'System Overview', subtitle: 'Real-time telemetry and cluster operations' },
  jobs: { title: 'Jobs & Tasks', subtitle: 'Job lifecycle registry, search, and scheduling diagnostics' },
  queues: { title: 'Queues', subtitle: 'Buffer depth, backlog pressure, and per-queue lifecycle counts' },
  workers: { title: 'Workers', subtitle: 'Cluster nodes, execution states, heartbeats, and failover control' },
  dlq: { title: 'Dead Letter Queue', subtitle: 'Failed tasks, error analysis, and one-click reprocessing' },
  metrics: { title: 'Telemetry Metrics', subtitle: 'Queue depth history, execution latency, throughput, and priority wait' },
  events: { title: 'Event Stream', subtitle: 'Live Server-Sent Events blackbox telemetry stream' }
};

export function TopBar({
  activeView,
  systemHealth, // { status: 'healthy' | 'degraded' | 'critical', reason: string }
  onOpenEnqueue,
  onRefresh,
  isRefreshing
}) {
  const [showHealthTooltip, setShowHealthTooltip] = useState(false);
  const context = VIEW_TITLES[activeView] || { title: activeView, subtitle: '' };

  const healthColor = 
    systemHealth.status === 'healthy' ? '#10b981' :
    systemHealth.status === 'degraded' ? '#f59e0b' : '#ef4444';

  const HealthIcon =
    systemHealth.status === 'healthy' ? ShieldCheck :
    systemHealth.status === 'degraded' ? AlertTriangle : AlertOctagon;

  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-canvas)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {/* Page Title & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h1 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {context.title}
        </h1>
        {context.subtitle && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'none', md: 'inline' }}>
            — {context.subtitle}
          </span>
        )}
      </div>

      {/* Right Controls: Health Badge, Refresh, Enqueue Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Derived System Health Badge with Auditable Tooltip */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowHealthTooltip(true)}
          onMouseLeave={() => setShowHealthTooltip(false)}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 9px',
              borderRadius: '9999px',
              background: `${healthColor}18`,
              border: `1px solid ${healthColor}40`,
              color: healthColor,
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'help'
            }}
          >
            <HealthIcon size={12} color={healthColor} />
            <span>SYSTEM {systemHealth.status}</span>
          </div>

          {showHealthTooltip && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                padding: '8px 12px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                width: '260px',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                fontSize: '11px'
              }}
            >
              <div style={{ fontWeight: 700, color: healthColor, marginBottom: '4px' }}>
                Health Derivation Logic:
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {systemHealth.reason}
              </div>
              <div style={{ marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                Signals: workers online, stale heartbeats (&gt;4.5s), stalled count, and DLQ errors.
              </div>
            </div>
          )}
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '5px',
            color: 'var(--text-secondary)',
            padding: '5px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="hover-subtle"
          title="Refresh current view"
        >
          <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
        </button>

        {/* Fast Action: Enqueue Job */}
        <button
          onClick={onOpenEnqueue}
          style={{
            background: 'var(--accent)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '5px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          className="hover-elevate"
        >
          <Plus size={14} />
          <span>Enqueue Job</span>
        </button>
      </div>
    </header>
  );
}
