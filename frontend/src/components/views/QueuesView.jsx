import React from 'react';
import { Layers, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export function QueuesView({ queues = [], onNavigateToJobs }) {
  // DOCUMENTED BACKLOG THRESHOLDS:
  // Normal: waiting < 25
  // Warning (Elevated): waiting >= 25
  // Critical (Backlog Pressure): waiting >= 100
  // Failure Warning: failed > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {queues.map(queue => {
          const waiting = queue.counts?.waiting || 0;
          const active = queue.counts?.active || 0;
          const delayed = queue.counts?.delayed || 0;
          const completed = queue.counts?.completed || 0;
          const failed = queue.counts?.failed || 0;
          const total = waiting + active + delayed + completed + failed;

          const isCritical = waiting >= 100;
          const isWarning = waiting >= 25 || failed > 0;
          const isHealthy = !isCritical && !isWarning;

          const healthLabel = isCritical ? 'Critical Backlog' : isWarning ? (failed > 0 ? 'Failures Detected' : 'Elevated Load') : 'Healthy';
          const healthStatus = isCritical ? 'critical' : isWarning ? 'warning' : 'healthy';

          return (
            <div
              key={queue.name}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'border-color 0.15s ease'
              }}
              className="hover-elevate"
            >
              {/* Card Header: Queue Name & Health */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '5px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Layers size={14} color="var(--accent)" />
                  </div>
                  <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    /{queue.name}
                  </span>
                </div>

                <StatusBadge status={healthStatus} labelOverride={healthLabel} />
              </div>

              {/* Counts Matrix */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Waiting</div>
                  <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: waiting > 25 ? '#fbbf24' : '#60a5fa' }}>
                    {waiting}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Active</div>
                  <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: '#22d3ee' }}>
                    {active}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Delayed</div>
                  <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: '#c084fc' }}>
                    {delayed}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Failed</div>
                  <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: failed > 0 ? '#f87171' : 'var(--text-tertiary)' }}>
                    {failed}
                  </div>
                </div>
              </div>

              {/* Card Footer: Click-through to Jobs */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  {completed} completed historically
                </span>

                <button
                  onClick={() => onNavigateToJobs(queue.name)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  className="hover-subtle"
                >
                  <span>Filter Jobs</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
