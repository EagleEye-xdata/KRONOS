import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, ArrowDownCircle, ChevronRight, ChevronDown, Filter } from 'lucide-react';

const EVENT_TYPE_STYLES = {
  'job:added': { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', label: 'ADDED' },
  'job:active': { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'ACTIVE' },
  'job:completed': { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', label: 'DONE' },
  'job:failed': { bg: 'rgba(248, 113, 113, 0.2)', color: '#f87171', label: 'FAILED' },
  'job:stalled': { bg: 'rgba(192, 132, 252, 0.18)', color: '#c084fc', label: 'STALLED' },
  'job:reassigned': { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', label: 'FAILOVER' },
  'worker:heartbeat': { bg: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', label: 'HEARTBEAT' },
  'worker:down': { bg: 'rgba(239, 68, 68, 0.25)', color: '#ef4444', label: 'WORKER DOWN' },
  'queue:depth': { bg: 'rgba(100, 116, 139, 0.08)', color: '#64748b', label: 'DEPTH' },
};

export function LiveEventLog({ events = [], onClear }) {
  const [filter, setFilter] = useState('jobs'); // 'jobs' | 'all' | 'failover' | 'system'
  const [expandedId, setExpandedId] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);

  // Filter events according to user preference
  const filteredEvents = events.filter(evt => {
    if (filter === 'jobs') {
      return evt.type.startsWith('job:') || evt.type === 'worker:down';
    }
    if (filter === 'failover') {
      return evt.type === 'job:reassigned' || evt.type === 'job:stalled' || evt.type === 'worker:down' || evt.type === 'job:failed';
    }
    if (filter === 'system') {
      return evt.type.startsWith('worker:') || evt.type === 'queue:depth';
    }
    return true; // 'all'
  });

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Terminal size={14} />
          <span>Live Telemetry Event Log</span>
          <span className="font-mono" style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '3px' }}>
            {filteredEvents.length} events
          </span>
        </div>

        {/* Filter Controls & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', padding: '2px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { id: 'jobs', label: 'Jobs & Alerts' },
              { id: 'failover', label: 'Failovers' },
              { id: 'all', label: 'All Events' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  background: filter === tab.id ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                  color: filter === tab.id ? 'var(--color-cyan)' : 'var(--color-text-dim)',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  fontWeight: filter === tab.id ? 600 : 400
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={onClear}
            className="btn-secondary"
            style={{ padding: '2px 6px', fontSize: '9px' }}
            title="Clear event history"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div
        ref={logContainerRef}
        className="panel-body"
        style={{
          padding: '4px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          background: '#080c14'
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--color-text-dim)',
            fontSize: '11px'
          }}>
            AWAITING TELEMETRY EVENTS...
          </div>
        ) : (
          filteredEvents.map(evt => {
            const style = EVENT_TYPE_STYLES[evt.type] || { bg: 'rgba(255,255,255,0.05)', color: '#fff', label: evt.type };
            const isExpanded = expandedId === evt.id;

            // Summary description
            let summary = '';
            if (evt.type.startsWith('job:')) {
              const jobId = evt.data?.id || 'unknown';
              const queue = evt.data?.queue || '';
              summary = `[${queue || 'job'}] #${jobId.slice(0, 8)}`;
              if (evt.type === 'job:reassigned') {
                summary += ` ➔ Reassigned to surviving worker`;
              } else if (evt.type === 'job:failed') {
                summary += ` error: ${evt.data?.failedReason || 'execution error'}`;
              }
            } else if (evt.type === 'worker:down') {
              summary = `Worker #${evt.data?.id} DIED (${evt.data?.reason || 'heartbeat timeout'})`;
            } else if (evt.type === 'queue:depth') {
              summary = `Total depth: ${evt.data?.total ?? '?'}`;
            } else if (evt.type === 'worker:heartbeat') {
              summary = `${Array.isArray(evt.data) ? evt.data.length : 1} workers active`;
            }

            return (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                  borderRadius: '3px',
                  border: isExpanded ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid transparent',
                  padding: '2px 4px',
                  transition: 'background 0.1s'
                }}
              >
                <div
                  onClick={() => toggleExpand(evt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  {/* Timestamp */}
                  <span style={{ color: 'var(--color-text-dim)', fontSize: '10px', flexShrink: 0 }}>
                    {formatTime(evt.timestamp)}
                  </span>

                  {/* Event Type Badge */}
                  <span
                    style={{
                      background: style.bg,
                      color: style.color,
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '2px',
                      minWidth: '65px',
                      textAlign: 'center',
                      flexShrink: 0,
                      border: `1px solid ${style.color}33`
                    }}
                  >
                    {style.label}
                  </span>

                  {/* Summary Text */}
                  <span style={{
                    color: evt.type === 'worker:down' ? '#f87171' : 
                           evt.type === 'job:reassigned' ? '#fb923c' : 'var(--color-text-main)',
                    fontWeight: evt.type === 'worker:down' || evt.type === 'job:reassigned' ? 700 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {summary}
                  </span>

                  {/* Expand icon */}
                  <span style={{ color: 'var(--color-text-dim)' }}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                </div>

                {/* Expanded Payload Inspector */}
                {isExpanded && (
                  <div style={{
                    marginTop: '4px',
                    padding: '6px',
                    background: '#04060a',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '10px',
                    color: '#94a3b8',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(evt.data, null, 2)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
