import React, { useState } from 'react';
import { AlertCircle, RotateCcw, Check, RefreshCw, AlertTriangle } from 'lucide-react';

export function FailedJobsTable({ failedJobs = [], onRetryJob, isRefreshing, onRefresh }) {
  const [retryingIds, setRetryingIds] = useState(new Set());
  const [successIds, setSuccessIds] = useState(new Set());

  const handleRetry = async (id) => {
    setRetryingIds(prev => new Set(prev).add(id));
    try {
      await onRetryJob(id);
      setSuccessIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        setSuccessIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 3000);
    } catch (err) {
      console.error('Failed to retry job:', err);
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return `${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <AlertCircle size={14} color="#f87171" />
          <span>Dead Letter Queue (DLQ / Failed Tasks)</span>
          <span
            className="font-mono"
            style={{
              fontSize: '9px',
              backgroundColor: failedJobs.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
              color: failedJobs.length > 0 ? '#f87171' : '#34d399',
              padding: '1px 6px',
              borderRadius: '3px',
              fontWeight: 700
            }}
          >
            {failedJobs.length} FAILED
          </span>
        </div>

        <button
          onClick={onRefresh}
          className="btn-secondary"
          style={{ padding: '2px 6px', fontSize: '9px' }}
          title="Refresh failed jobs"
        >
          <RefreshCw size={11} className={isRefreshing ? 'spin' : ''} />
        </button>
      </div>

      <div className="panel-body" style={{ padding: '0', overflowY: 'auto' }}>
        {failedJobs.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-dim)',
            padding: '24px',
            gap: '8px'
          }}>
            <Check size={24} color="#34d399" />
            <div className="font-mono" style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
              DLQ CLEAR — ALL JOBS HEALTHY
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              No unhandled worker failures or rejected tasks in queue
            </div>
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)'
          }}>
            <thead>
              <tr style={{
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--color-text-muted)',
                textAlign: 'left',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                <th style={{ padding: '6px 8px' }}>Job ID</th>
                <th style={{ padding: '6px 8px' }}>Queue</th>
                <th style={{ padding: '6px 8px' }}>Reason</th>
                <th style={{ padding: '6px 8px' }}>Attempts</th>
                <th style={{ padding: '6px 8px' }}>Failed At</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {failedJobs.map(job => {
                const isRetrying = retryingIds.has(job.id);
                const isSuccess = successIds.has(job.id);

                return (
                  <tr
                    key={job.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '6px 8px', color: 'var(--color-cyan)', fontWeight: 600 }}>
                      #{job.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>
                      /{job.queue}
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      color: '#f87171',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={job.failedReason}>
                      {job.failedReason || 'Unknown execution fault'}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#fbbf24' }}>
                      {job.attemptsMade} / {job.attempts || 3}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--color-text-dim)', fontSize: '10px' }}>
                      {formatTimestamp(job.finishedOn || job.timestamp)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {isSuccess ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#34d399',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          <Check size={12} /> REQUEUED
                        </span>
                      ) : (
                        <button
                          className="btn-secondary"
                          onClick={() => handleRetry(job.id)}
                          disabled={isRetrying}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.4)',
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '3px 8px',
                            fontSize: '9px',
                            fontWeight: 700
                          }}
                        >
                          <RotateCcw size={10} className={isRetrying ? 'spin' : ''} />
                          <span>{isRetrying ? 'RETRYING...' : 'REPROCESS'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
