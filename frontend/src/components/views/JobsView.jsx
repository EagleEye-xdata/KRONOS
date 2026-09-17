import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityChip } from '../ui/PriorityChip';
import { JobDetailDrawer } from './JobDetailDrawer';

export function JobsView({
  jobs = [],
  queues = [],
  onRetryJob,
  onRefresh,
  isRefreshing,
  initialQueueFilter = ''
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState(initialQueueFilter || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter & Search Logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = job.id?.toLowerCase().includes(q);
        const queueMatch = job.queue?.toLowerCase().includes(q);
        const payloadMatch = job.payload ? JSON.stringify(job.payload).toLowerCase().includes(q) : false;
        if (!idMatch && !queueMatch && !payloadMatch) return false;
      }

      // Status
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      // Queue
      if (queueFilter !== 'all' && job.queue !== queueFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'all' && Number(job.priority) !== Number(priorityFilter)) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, statusFilter, queueFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Filters & Search Toolbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} color="var(--text-tertiary)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by job ID, queue, or payload..."
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              padding: '5px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="delayed">Delayed</option>
          </select>

          {/* Queue Filter */}
          <select
            value={queueFilter}
            onChange={e => { setQueueFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              padding: '5px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
          >
            <option value="all">All Queues</option>
            {queues.map(q => (
              <option key={q.name} value={q.name}>/{q.name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              padding: '5px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
          >
            <option value="all">All Priorities</option>
            <option value="1">P1 (Urgent)</option>
            <option value="5">P5 (Normal)</option>
            <option value="10">P10 (Low)</option>
          </select>
        </div>

        {/* Priority Semantics Indicator Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <HelpCircle size={11} color="var(--accent)" />
          <span>BullMQ priority: P1 (Urgent) &gt; P10 (Low)</span>
        </div>
      </div>

      {/* Dense Data Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--text-tertiary)',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}
              >
                <th style={{ padding: '8px 12px' }}>Job ID</th>
                <th style={{ padding: '8px 12px' }}>Queue</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
                <th style={{ padding: '8px 12px' }}>Priority</th>
                <th style={{ padding: '8px 12px' }}>Created</th>
                <th style={{ padding: '8px 12px' }}>Scheduled/Wait</th>
                <th style={{ padding: '8px 12px' }}>Duration</th>
                <th style={{ padding: '8px 12px' }}>Attempts</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No jobs match the specified criteria.
                  </td>
                </tr>
              ) : (
                paginatedJobs.map(job => {
                  let durationStr = '—';
                  if (job.processedAt && job.finishedOn) {
                    durationStr = `${Math.max(0, job.finishedOn - job.processedAt)}ms`;
                  } else if (job.processedAt) {
                    durationStr = 'running...';
                  }

                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        transition: 'background 0.1s'
                      }}
                      className="hover-subtle"
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--accent)', fontWeight: 600 }}>
                        #{job.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        /{job.queue}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <StatusBadge status={job.status} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <PriorityChip priority={job.priority} />
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>
                        {formatTime(job.timestamp)}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>
                        {job.delayMs > 0 ? (
                          <span style={{ color: '#c084fc' }}>delay: {job.delayMs}ms</span>
                        ) : job.schedulingDeltaMs !== null ? (
                          <span>+{job.schedulingDeltaMs}ms</span>
                        ) : 'immediate'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        {durationStr}
                      </td>
                      <td style={{ padding: '8px 12px', color: job.attemptsMade > 1 ? '#fbbf24' : 'var(--text-tertiary)' }}>
                        {job.attemptsMade} / {job.attempts || 3}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {job.status === 'failed' && (
                            <button
                              onClick={() => onRetryJob(job.id)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '3px',
                                color: 'var(--accent)',
                                padding: '2px 6px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Requeue failed task"
                            >
                              <RotateCcw size={10} />
                              <span>Retry</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedJob(job)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-tertiary)',
                              padding: '2px 4px',
                              cursor: 'pointer'
                            }}
                            title="Inspect job lifecycle"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-tertiary)'
          }}
        >
          <span>
            Showing {filteredJobs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredJobs.length)} of {filteredJobs.length} tasks
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '3px',
                color: currentPage <= 1 ? 'var(--text-disabled)' : 'var(--text-secondary)',
                padding: '2px 6px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={12} />
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '3px',
                color: currentPage >= totalPages ? 'var(--text-disabled)' : 'var(--text-secondary)',
                padding: '2px 6px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        onRetryJob={onRetryJob}
      />
    </div>
  );
}
