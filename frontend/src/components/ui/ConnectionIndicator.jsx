import React from 'react';
import { RefreshCw, Radio, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function ConnectionIndicator({ status, reconnectAttempt = 0, onManualReconnect }) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const isDisconnected = status === 'disconnected' || status === 'offline';

  let color = '#10b981';
  let label = 'Live Telemetry';
  let dotAnimation = 'statusPulse 2s infinite ease-in-out';

  if (isReconnecting) {
    color = '#f59e0b';
    label = `Reconnecting (${reconnectAttempt})`;
    dotAnimation = 'statusPulse 1s infinite ease-in-out';
  } else if (isDisconnected) {
    color = '#ef4444';
    label = 'Disconnected (Stale Data)';
    dotAnimation = 'none';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.03em',
          color
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
            animation: dotAnimation
          }}
        />
        <span>{label}</span>
      </div>

      {!isConnected && onManualReconnect && (
        <button
          onClick={onManualReconnect}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 4px'
          }}
          title="Force reconnect SSE stream"
        >
          <RefreshCw size={11} className={isReconnecting ? 'spin' : ''} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
