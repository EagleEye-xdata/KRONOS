import React, { useState } from 'react';
import { 
  AlertOctagon, 
  RotateCcw, 
  Check, 
  RefreshCw, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityChip } from '../ui/PriorityChip';
import { JobDetailDrawer } from './JobDetailDrawer';

export function DLQView({
  failedJobs = [],
  onRetryJob,
  onRefresh,
  isRefreshing
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [retryingIds, setRetryingIds] = useState(new Set());
  const [requeuedIds, setRequeuedIds] = useState(new Set());

  const handleRetry = async (id) => {
    setRetryingIds(prev => new Set(prev).add(id));
    try {
      await onRetryJob(id);
      setRequeuedIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        setRequeuedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 3000);
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
      {/* Top Banner Info */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '5px',
              background: failedJobs.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {failedJobs.length > 0 ? (
              <AlertOctagon size={16} color="#ef4444" />
            ) : (
              <CheckCircle2 size={16} color="#10b981" />
            )}
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Dead Letter Queue (Failed Tasks)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {failedJobs.length > 0 ? (
                `${failedJobs.length} tasks exhausted retries or encountered unhandled exceptions`
              ) : (
                'All queues nominal — zero rejected or dead-letter tasks'
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            padding: '5px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          className="hover-subtle"
        >
          <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
          <span>Refresh DLQ</span>
        </button>
      </div>

      {/* DLQ Table */}
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
          {failedJobs.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: 'var(--text-tertiary)',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={28} color="#10b981" />
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                DLQ IS EMPTY
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                No failed tasks pending inspection or reprocessing.
              </div>
            </div>
          ) : (
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
                  <th style={{ padding: '8px 12px' }}>Priority</th>
                  <th style={{ padding: '8px 12px' }}>Failure Reason</th>
                  <th style={{ padding: '8px 12px' }}>Attempts</th>
                  <th style={{ padding: '8px 12px' }}>Failed At</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedJobs.map(job => {
                  const isRetrying = retryingIds.has(job.id);
                  const isRequeued = requeuedIds.has(job.id);

                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        background: isRequeued ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                      className="hover-subtle"
                    >
                      <td style={{ padding: '8px 12px', color: '#f87171', fontWeight: 600 }}>
                        #{job.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        /{job.queue}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <PriorityChip priority={job.priority} />
                      </td>
                      <td style={{ padding: '8px 12px', color: '#fca5a5', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.failedReason}>
                        {job.failedReason || 'Execution error'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#fbbf24' }}>
                        {job.attemptsMade} / {job.attempts || 3}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>
                        {formatTime(job.finishedOn || job.timestamp)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {isRequeued ? (
                            <span style={{ color: '#10b981', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                              <Check size={12} /> Requeued
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRetry(job.id)}
                              disabled={isRetrying}
                              style={{
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                borderRadius: '3px',
                                color: 'var(--accent)',
                                padding: '3px 8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: isRetrying ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Requeue failed task (POST /api/jobs/:id/retry)"
                            >
                              <RotateCcw size={10} className={isRetrying ? 'spin' : ''} />
                              <span>{isRetrying ? 'Requeuing...' : 'Reprocess'}</span>
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
                            title="Inspect job detail"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
