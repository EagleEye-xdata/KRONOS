import React, { useState } from 'react';
import { 
  Drawer 
} from '../ui/Drawer';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityChip } from '../ui/PriorityChip';
import { 
  Clock, 
  RotateCcw, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  ArrowRight,
  FileCode,
  Calendar
} from 'lucide-react';

export function JobDetailDrawer({ job, isOpen, onClose, onRetryJob }) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!job) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleRetry = async () => {
    if (!job.id) return;
    setIsRetrying(true);
    try {
      await onRetryJob(job.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')} (${d.toLocaleDateString()})`;
  };

  // Execution Duration
  let durationMs = null;
  if (job.processedAt && job.finishedOn) {
    durationMs = Math.max(0, job.finishedOn - job.processedAt);
  }

  // Queue Wait Time
  let queueWaitMs = null;
  if (job.timestamp && job.processedAt) {
    queueWaitMs = Math.max(0, job.processedAt - (job.scheduledFor || job.timestamp));
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Job #${job.id}`}
      subtitle={`Queue: /${job.queue} • Name: ${job.name || 'task'}`}
      width="560px"
      footer={
        job.status === 'failed' ? (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={13} className={isRetrying ? 'spin' : ''} />
            <span>{isRetrying ? 'Requeuing...' : 'Requeue Job (Retry)'}</span>
          </button>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Top Status & Priority Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>State:</span>
            <StatusBadge status={job.status} size="md" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Priority:</span>
            <PriorityChip priority={job.priority} showExplanation={true} />
          </div>
        </div>

        {/* Real Visual Lifecycle Stepper */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
            Execution Lifecycle Timeline
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px', borderLeft: '2px solid var(--border-subtle)', marginLeft: '6px' }}>
            {/* 1. Created */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-16px', top: '2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Created &amp; Registered</div>
              <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{formatTs(job.timestamp)}</div>
            </div>

            {/* 2. Scheduled / Delayed (if any) */}
            {job.delayMs > 0 && (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a855f7' }} />
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc' }}>Scheduled Target (Delay: {job.delayMs}ms)</div>
                <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  {formatTs(job.scheduledFor)} {job.schedulingDeltaMs !== null && <span style={{ color: 'var(--accent)' }}>[Drift: +{job.schedulingDeltaMs}ms]</span>}
                </div>
              </div>
            )}

            {/* 3. Assigned & Processing */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-16px', top: '2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: job.processedAt ? '#06b6d4' : 'var(--border-default)' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: job.processedAt ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                Assigned to Worker {queueWaitMs !== null && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 400 }}>(waited in queue: {queueWaitMs}ms)</span>}
              </div>
              <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{formatTs(job.processedAt)}</div>
            </div>

            {/* 4. Terminal State: Completed or Failed */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '-16px',
                top: '2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: job.status === 'completed' ? '#10b981' : job.status === 'failed' ? '#ef4444' : 'var(--border-default)'
              }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: job.status === 'completed' ? '#34d399' : job.status === 'failed' ? '#f87171' : 'var(--text-disabled)' }}>
                {job.status === 'completed' ? 'Execution Completed' : job.status === 'failed' ? 'Execution Failed' : 'Awaiting Completion'}
                {durationMs !== null && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 400 }}> (ran for {durationMs}ms)</span>}
              </div>
              <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{formatTs(job.finishedOn)}</div>
            </div>
          </div>
        </div>

        {/* Failure Diagnostic (if failed) */}
        {job.failedReason && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
              <AlertCircle size={14} />
              <span>Failure Reason / Exception</span>
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: '#fca5a5', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              {job.failedReason}
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              Attempts made: {job.attemptsMade} of {job.attempts || 3}
            </div>
          </div>
        )}

        {/* Return Value / Result (if completed) */}
        {job.returnvalue && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
              Worker Return Value
            </div>
            <pre style={{ background: '#05080e', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#34d399', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
              {typeof job.returnvalue === 'object' ? JSON.stringify(job.returnvalue, null, 2) : String(job.returnvalue)}
            </pre>
          </div>
        )}

        {/* Payload JSON Inspector with Copy Button */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
              Job Payload Data
            </span>
            <button
              onClick={() => handleCopy(JSON.stringify(job.payload, null, 2))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              className="hover-subtle"
            >
              {copiedPayload ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <pre style={{
            background: '#05080e',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '11px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            overflowX: 'auto',
            maxHeight: '200px'
          }}>
            {job.payload ? JSON.stringify(job.payload, null, 2) : '{}'}
          </pre>
        </div>
      </div>
    </Drawer>
  );
}
