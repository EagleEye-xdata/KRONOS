import React from 'react';

const STATUS_MAP = {
  // Worker states
  online: { label: 'Online', bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)', dot: '#10b981' },
  stalled: { label: 'Stalled', bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', dot: '#f59e0b' },
  offline: { label: 'Offline', bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', dot: '#ef4444' },

  // Job states
  waiting: { label: 'Waiting', bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)', dot: '#3b82f6' },
  active: { label: 'Active', bg: 'rgba(6, 182, 212, 0.12)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)', dot: '#06b6d4' },
  completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.25)', dot: '#10b981' },
  failed: { label: 'Failed', bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', dot: '#ef4444' },
  delayed: { label: 'Delayed', bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)', dot: '#a855f7' },

  // System health
  healthy: { label: 'Healthy', bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)', dot: '#10b981' },
  degraded: { label: 'Degraded', bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', dot: '#f59e0b' },
  critical: { label: 'Critical', bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', dot: '#ef4444' },
  idle: { label: 'Idle', bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.2)', dot: '#64748b' }
};

export function StatusBadge({ status, pulse = false, labelOverride, size = 'sm' }) {
  const normStatus = (status || '').toLowerCase();
  const config = STATUS_MAP[normStatus] || {
    label: status || 'Unknown',
    bg: 'rgba(255, 255, 255, 0.05)',
    text: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.1)',
    dot: '#64748b'
  };

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '5px' : '7px',
        padding: isSmall ? '1px 7px' : '3px 9px',
        borderRadius: '9999px',
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        fontFamily: 'var(--font-mono)',
        fontSize: isSmall ? '10px' : '11px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        userSelect: 'none',
        lineHeight: 1.4
      }}
    >
      <span
        style={{
          width: isSmall ? '6px' : '7px',
          height: isSmall ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: config.dot,
          display: 'inline-block',
          boxShadow: pulse ? `0 0 6px ${config.dot}` : 'none',
          animation: pulse ? 'statusPulse 2s infinite ease-in-out' : 'none'
        }}
      />
      <span>{labelOverride || config.label}</span>
    </span>
  );
}
