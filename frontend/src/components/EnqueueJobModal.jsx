import React, { useState } from 'react';
import { X, Send, Clock, Layers, HelpCircle, CheckCircle2 } from 'lucide-react';
import { PriorityChip } from './ui/PriorityChip';

export function EnqueueJobModal({ isOpen, onClose, onEnqueue, queues = [] }) {
  const [queueName, setQueueName] = useState('default');
  const [customQueue, setCustomQueue] = useState('');
  const [payloadText, setPayloadText] = useState('{\n  "action": "render-report",\n  "workMs": 2500\n}');
  const [delayMs, setDelayMs] = useState(0);
  const [priority, setPriority] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEnqueuedId, setLastEnqueuedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const defaultQueues = ['default', 'critical', 'email', 'reports'];
  const availableQueues = Array.from(new Set([...defaultQueues, ...queues.map(q => q.name)]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const targetQueue = queueName === '__custom__' ? customQueue.trim() : queueName;
    if (!targetQueue) {
      setErrorMsg('Queue name is required');
      setIsSubmitting(false);
      return;
    }

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      parsedPayload = { raw: payloadText };
    }

    try {
      const record = await onEnqueue({
        queue: targetQueue,
        payload: parsedPayload,
        delayMs: Number(delayMs) || 0,
        priority: Number(priority) || 5,
      });
      setLastEnqueuedId(record.id);
      setTimeout(() => {
        setLastEnqueuedId(null);
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
          width: '90%',
          maxWidth: '480px',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={14} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Enqueue Task (POST /api/jobs)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', padding: '8px 10px', color: '#f87171', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {errorMsg}
            </div>
          )}

          {lastEnqueuedId && (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', padding: '8px 10px', color: '#34d399', fontSize: '11px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} />
              <span>Job #{lastEnqueuedId.slice(0, 8)} successfully enqueued</span>
            </div>
          )}

          {/* Queue Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Queue
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {availableQueues.map(q => (
                <button
                  type="button"
                  key={q}
                  onClick={() => { setQueueName(q); setCustomQueue(''); }}
                  style={{
                    background: queueName === q ? 'var(--accent)' : 'var(--bg-surface)',
                    border: `1px solid ${queueName === q ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    color: queueName === q ? '#fff' : 'var(--text-secondary)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer'
                  }}
                >
                  /{q}
                </button>
              ))}
            </div>
          </div>

          {/* Delay */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Execution Delay
              </label>
              <span className="font-mono" style={{ fontSize: '10px', color: delayMs > 0 ? '#c084fc' : '#10b981' }}>
                {delayMs === 0 ? 'Immediate (0ms)' : `${delayMs}ms`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: 'Immediate', val: 0 },
                { label: '1s', val: 1000 },
                { label: '2s', val: 2000 },
                { label: '5s', val: 5000 },
                { label: '10s', val: 10000 },
              ].map(d => (
                <button
                  type="button"
                  key={d.val}
                  onClick={() => setDelayMs(d.val)}
                  style={{
                    flex: 1,
                    background: delayMs === d.val ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-surface)',
                    border: `1px solid ${delayMs === d.val ? '#a855f7' : 'var(--border-subtle)'}`,
                    color: delayMs === d.val ? '#c084fc' : 'var(--text-tertiary)',
                    borderRadius: '4px',
                    padding: '4px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority (with explicit BullMQ lower=higher guidance) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Priority Level
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                <HelpCircle size={10} color="var(--accent)" />
                <span>BullMQ: P1 outranks P10</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { val: 1, label: 'P1 (Urgent)' },
                { val: 5, label: 'P5 (Standard)' },
                { val: 10, label: 'P10 (Low)' },
              ].map(p => (
                <button
                  type="button"
                  key={p.val}
                  onClick={() => setPriority(p.val)}
                  style={{
                    flex: 1,
                    background: priority === p.val ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                    border: `1px solid ${priority === p.val ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                    borderRadius: '4px',
                    padding: '5px 4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  <PriorityChip priority={p.val} showExplanation={true} />
                </button>
              ))}
            </div>
          </div>

          {/* Payload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Payload (JSON)
            </label>
            <textarea
              rows={4}
              value={payloadText}
              onChange={e => setPayloadText(e.target.value)}
              style={{
                background: '#04070c',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '8px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                padding: '5px 12px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Send size={12} />
              <span>{isSubmitting ? 'Enqueuing...' : 'Enqueue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
