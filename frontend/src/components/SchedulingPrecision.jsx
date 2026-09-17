import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Target, Sparkles } from 'lucide-react';

export function SchedulingPrecision({ scheduledJobs = [], completedDelayedJobs = [] }) {
  const [now, setNow] = useState(Date.now());

  // Ticker for delayed jobs countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  // Compute precision stats across completed delayed jobs
  const evaluatedJobs = completedDelayedJobs.filter(j => j.scheduledFor && j.processedAt);
  const deltas = evaluatedJobs.map(j => Math.max(0, j.processedAt - j.scheduledFor));
  const avgDelta = deltas.length > 0 ? (deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1) : '0.0';
  const minDelta = deltas.length > 0 ? Math.min(...deltas) : 0;
  const maxDelta = deltas.length > 0 ? Math.max(...deltas) : 0;

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Target size={14} color="var(--color-cyan)" />
          <span>Scheduling Precision & Drift Inspector</span>
        </div>

        {evaluatedJobs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '9px', color: 'var(--color-text-dim)' }}>
              AVG DRIFT:
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: Number(avgDelta) < 15 ? '#34d399' : Number(avgDelta) < 50 ? 'var(--color-cyan)' : '#fbbf24',
                background: 'rgba(0,0,0,0.4)',
                padding: '1px 6px',
                borderRadius: '3px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              ±{avgDelta} ms
            </span>
          </div>
        )}
      </div>

      <div className="panel-body" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Precision KPI Summary Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          background: 'rgba(0,0,0,0.25)',
          padding: '6px',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.04)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Avg Drift</div>
            <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>
              +{avgDelta} ms
            </div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Min Drift</div>
            <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-cyan)' }}>
              +{minDelta} ms
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Peak Drift</div>
            <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: maxDelta > 100 ? '#f87171' : '#fbbf24' }}>
              +{maxDelta} ms
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {scheduledJobs.length === 0 && evaluatedJobs.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-dim)',
              fontSize: '11px',
              padding: '16px'
            }}>
              <Clock size={20} style={{ marginBottom: '4px' }} />
              <div>NO SCHEDULED JOBS OBSERVED YET</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Dispatch a job with delay (e.g. 2000ms) to measure timer precision</div>
            </div>
          ) : (
            <>
              {/* Currently Delayed / Scheduled countdown items */}
              {scheduledJobs.map(job => {
                const remainingMs = Math.max(0, job.scheduledFor - now);
                const isReady = remainingMs === 0;

                return (
                  <div
                    key={job.id}
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: '4px',
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#c084fc', fontWeight: 700 }}>#{job.id.slice(0, 8)}</span>
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '9px' }}>/{job.queue}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                        Requested: {job.delayMs}ms
                      </span>
                      <span style={{
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: '#c084fc',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 700
                      }}>
                        {isReady ? 'DISPATCHING...' : `in ${(remainingMs / 1000).toFixed(2)}s`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Completed Scheduled Jobs with Measured Precision */}
              {evaluatedJobs.slice(0, 10).map(job => {
                const delta = Math.max(0, job.processedAt - job.scheduledFor);
                const isSuperPrecise = delta < 15;
                const isGood = delta < 50;

                return (
                  <div
                    key={job.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '4px',
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>#{job.id.slice(0, 8)}</span>
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '9px' }}>/{job.queue}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#64748b', fontSize: '10px' }}>
                        Req: {job.delayMs || 0}ms
                      </span>
                      <div
                        style={{
                          background: isSuperPrecise ? 'rgba(16, 185, 129, 0.15)' : isGood ? 'rgba(0, 240, 255, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isSuperPrecise ? '#34d399' : isGood ? 'var(--color-cyan)' : '#fbbf24',
                          border: `1px solid ${isSuperPrecise ? 'rgba(16, 185, 129, 0.3)' : isGood ? 'rgba(0, 240, 255, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>Δ +{delta}ms</span>
                        {isSuperPrecise && <Sparkles size={9} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
