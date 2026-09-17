import React from 'react';

export function MetricTile({
  label,
  value,
  unit,
  subtext,
  status = 'default', // 'default' | 'healthy' | 'warning' | 'critical' | 'active'
  onClick,
  icon: Icon
}) {
  const statusColors = {
    default: { text: '#f1f5f9', border: 'var(--border-subtle)' },
    healthy: { text: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
    warning: { text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
    critical: { text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
    active: { text: '#06b6d4', border: 'rgba(6, 182, 212, 0.25)' }
  };

  const currentTheme = statusColors[status] || statusColors.default;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '6px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minWidth: '120px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        position: 'relative'
      }}
      className={onClick ? 'hover-elevate' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: 'var(--font-sans)'
        }}>
          {label}
        </span>
        {Icon && <Icon size={13} color="var(--text-tertiary)" />}
      </div>

      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: currentTheme.text,
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}
        >
          {value ?? '-'}
        </span>
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {unit}
          </span>
        )}
      </div>

      {subtext && (
        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
