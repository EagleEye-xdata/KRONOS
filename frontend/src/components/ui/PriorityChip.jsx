import React, { useState } from 'react';

export function PriorityChip({ priority = 0, showExplanation = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const p = Number(priority) || 0;

  // BullMQ: 1 is highest priority.
  // 1-2: Urgent / Critical (Rose/Red)
  // 3-4: High (Amber)
  // 5-6: Normal / Default (Blue)
  // 7-10: Low / Background (Slate)
  // 0: Default / Unset (BullMQ default 0)

  let color = '#94a3b8';
  let bg = 'rgba(148, 163, 184, 0.1)';
  let border = 'rgba(148, 163, 184, 0.2)';
  let urgency = 'Normal';

  if (p === 1 || p === 2) {
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.12)';
    border = 'rgba(239, 68, 68, 0.3)';
    urgency = 'Urgent (High)';
  } else if (p === 3 || p === 4) {
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.12)';
    border = 'rgba(245, 158, 11, 0.3)';
    urgency = 'Elevated';
  } else if (p === 5 || p === 6) {
    color = '#60a5fa';
    bg = 'rgba(59, 130, 246, 0.1)';
    border = 'rgba(59, 130, 246, 0.25)';
    urgency = 'Standard';
  } else if (p >= 7) {
    color = '#64748b';
    bg = 'rgba(100, 116, 139, 0.1)';
    border = 'rgba(100, 116, 139, 0.2)';
    urgency = 'Low';
  } else if (p === 0) {
    color = '#94a3b8';
    bg = 'rgba(255, 255, 255, 0.05)';
    border = 'rgba(255, 255, 255, 0.1)';
    urgency = 'Default (0)';
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '1px 6px',
          borderRadius: '4px',
          background: bg,
          color,
          border: `1px solid ${border}`,
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 600,
          cursor: 'help',
          letterSpacing: '0.02em'
        }}
      >
        <span>P{p || '0'}</span>
        {showExplanation && (
          <span style={{ fontSize: '9px', opacity: 0.85 }}>({urgency})</span>
        )}
      </span>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '5px',
            padding: '6px 9px',
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '5px',
            color: '#f1f5f9',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 700, color }}>Priority: P{p} ({urgency})</div>
          <div style={{ color: '#94a3b8', fontSize: '9px', marginTop: '2px' }}>
            BullMQ rule: lower numbers outrank higher (P1 &gt; P10)
          </div>
        </div>
      )}
    </div>
  );
}
