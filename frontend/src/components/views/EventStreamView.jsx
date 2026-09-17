import React, { useState } from 'react';
import { 
  Radio, 
  Pause, 
  Play, 
  Trash2, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Filter,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

const EVENT_TYPE_STYLES = {
  'job:added': { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)', label: 'JOB:ADDED' },
  'job:active': { color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.12)', label: 'JOB:ACTIVE' },
  'job:completed': { color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', label: 'JOB:DONE' },
  'job:failed': { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', label: 'JOB:FAILED' },
  'job:stalled': { color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)', label: 'JOB:STALLED' },
  'job:reassigned': { color: '#fb923c', bg: 'rgba(249, 115, 22, 0.2)', label: 'FAILOVER' },
  'worker:heartbeat': { color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.1)', label: 'HEARTBEAT' },
  'worker:down': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.25)', label: 'WORKER:DOWN' },
  'queue:depth': { color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)', label: 'DEPTH:TICK' },
};

export function EventStreamView({
  events = [],
  onClearEvents,
  isPaused,
  onTogglePause
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'jobs' | 'workers' | 'failover' | 'depth'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredEvents = events.filter(evt => {
    if (filterType === 'jobs') {
      if (!evt.type.startsWith('job:') && evt.type !== 'worker:down') return false;
    } else if (filterType === 'workers') {
      if (!evt.type.startsWith('worker:')) return false;
    } else if (filterType === 'failover') {
      if (evt.type !== 'job:reassigned' && evt.type !== 'job:stalled' && evt.type !== 'worker:down') return false;
    } else if (filterType === 'depth') {
      if (evt.type !== 'queue:depth') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const typeMatch = evt.type.toLowerCase().includes(q);
      const dataMatch = JSON.stringify(evt.data || {}).toLowerCase().includes(q);
      if (!typeMatch && !dataMatch) return false;
    }

    return true;
  });

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Control Toolbar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '360px' }}>
            <Search size={13} color="var(--text-tertiary)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search event type or payload..."
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                padding: '5px 10px 5px 28px',
                fontSize: '11px',
                fontFamily: 'var(--font-sans)',
                outline: 'none'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'jobs', label: 'Jobs' },
              { id: 'failover', label: 'Failovers' },
              { id: 'workers', label: 'Workers' },
              { id: 'depth', label: 'Depth' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  background: filterType === tab.id ? 'var(--accent)' : 'transparent',
                  color: filterType === tab.id ? '#fff' : 'var(--text-tertiary)',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  fontWeight: filterType === tab.id ? 700 : 400
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stream Actions: Pause, Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onTogglePause}
            style={{
              background: isPaused ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface-elevated)',
              border: `1px solid ${isPaused ? '#f59e0b' : 'var(--border-default)'}`,
              color: isPaused ? '#fbbf24' : 'var(--text-secondary)',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>

          <button
            onClick={onClearEvents}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-tertiary)',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            className="hover-subtle"
            title="Clear event buffer"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div
        style={{
          background: '#04070c',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Awaiting Server-Sent Events...
          </div>
        ) : (
          filteredEvents.map(evt => {
            const style = EVENT_TYPE_STYLES[evt.type] || { color: '#94a3b8', bg: 'rgba(255,255,255,0.05)', label: evt.type };
            const isExpanded = expandedIds.has(evt.id);

            return (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '4px',
                  border: isExpanded ? '1px solid var(--border-default)' : '1px solid transparent',
                  padding: '3px 6px',
                  transition: 'background 0.1s'
                }}
              >
                <div
                  onClick={() => toggleExpand(evt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '10px', minWidth: '78px' }}>
                    {formatTime(evt.timestamp)}
                  </span>

                  <span
                    style={{
                      background: style.bg,
                      color: style.color,
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      minWidth: '82px',
                      textAlign: 'center'
                    }}
                  >
                    {style.label}
                  </span>

                  <span
                    style={{
                      color: evt.type === 'job:reassigned' ? '#fb923c' : evt.type === 'worker:down' ? '#f87171' : 'var(--text-primary)',
                      fontWeight: evt.type === 'job:reassigned' || evt.type === 'worker:down' ? 700 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {evt.type === 'job:reassigned' ? `FAILOVER: Job #${evt.data?.id} reassigned from stalled worker` :
                     evt.type === 'worker:down' ? `WORKER DOWN: Worker #${evt.data?.id} (${evt.data?.reason || 'died'})` :
                     evt.type.startsWith('job:') ? `[/${evt.data?.queue || 'task'}] #${evt.data?.id || ''}` :
                     JSON.stringify(evt.data).slice(0, 80)}
                  </span>

                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px 10px',
                      background: '#020408',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '10px',
                      color: '#94a3b8',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
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
