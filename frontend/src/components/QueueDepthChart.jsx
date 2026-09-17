import React, { useRef, useEffect, useState } from 'react';
import { Layers, Activity, TrendingUp } from 'lucide-react';

const SERIES_CONFIG = [
  { key: 'waiting', label: 'Waiting', color: '#38bdf8', fill: 'rgba(56, 189, 248, 0.15)' },
  { key: 'active', label: 'Active', color: '#fbbf24', fill: 'rgba(251, 191, 36, 0.15)' },
  { key: 'completed', label: 'Completed', color: '#34d399', fill: 'rgba(52, 211, 153, 0.1)' },
  { key: 'delayed', label: 'Delayed', color: '#c084fc', fill: 'rgba(192, 132, 252, 0.12)' },
  { key: 'failed', label: 'Failed', color: '#f87171', fill: 'rgba(248, 113, 113, 0.2)' },
];

export function QueueDepthChart({ history = [], queues = [] }) {
  const canvasRef = useRef(null);
  const [hoverData, setHoverData] = useState(null);
  const [activeSeries, setActiveSeries] = useState({
    waiting: true,
    active: true,
    completed: true,
    delayed: true,
    failed: true,
  });

  const toggleSeries = (key) => {
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!history || history.length === 0) {
      // Empty state
      ctx.fillStyle = '#4c5d75';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AWAITING TELEMETRY STREAM...', width / 2, height / 2);
      ctx.restore();
      return;
    }

    // Chart margins
    const padding = { top: 15, right: 15, bottom: 25, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate maximum value across all visible series
    let maxValue = 5;
    history.forEach(item => {
      SERIES_CONFIG.forEach(({ key }) => {
        if (activeSeries[key]) {
          const val = Number(item[key]) || 0;
          if (val > maxValue) maxValue = val;
        }
      });
    });
    // Add headroom
    maxValue = Math.ceil(maxValue * 1.15);

    // Draw Grid Lines & Y-Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = Math.round((maxValue / ySteps) * i);
      const yPos = padding.top + chartHeight - (i / ySteps) * chartHeight;
      
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.fillText(String(yVal), padding.left - 6, yPos + 3);
    }

    // Draw Time Axis Markers
    ctx.textAlign = 'center';
    ctx.fillText('-60s', padding.left, height - 8);
    ctx.fillText('-30s', padding.left + chartWidth / 2, height - 8);
    ctx.fillText('NOW', width - padding.right, height - 8);

    // Render Each Series
    const pointsCount = Math.max(history.length, 2);
    const xStep = chartWidth / (pointsCount - 1);

    SERIES_CONFIG.forEach(({ key, color, fill }) => {
      if (!activeSeries[key]) return;

      const points = history.map((item, idx) => {
        const val = Number(item[key]) || 0;
        const x = padding.left + idx * xStep;
        const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
        return { x, y, val };
      });

      if (points.length < 2) return;

      // Draw Area Fill
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      points.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, fill);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Current Value dot at rightmost point
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#070a12';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.restore();
  }, [history, activeSeries]);

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Layers size={14} />
          <span>Queue Depth Telemetry (Live Stream)</span>
        </div>

        {/* Series Filter Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {SERIES_CONFIG.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleSeries(key)}
              style={{
                background: activeSeries[key] ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${activeSeries[key] ? color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: activeSeries[key] ? color : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: activeSeries[key] ? 1 : 0.45,
                transition: 'all 0.15s'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
        {/* Real-time Canvas Area */}
        <div style={{ flex: 1, minHeight: '140px', position: 'relative', width: '100%' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* Per-Queue Counts Strip */}
        {queues && queues.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            {queues.map(q => {
              const waiting = q.counts?.waiting || 0;
              const active = q.counts?.active || 0;
              const delayed = q.counts?.delayed || 0;
              const failed = q.counts?.failed || 0;
              const completed = q.counts?.completed || 0;
              
              return (
                <div
                  key={q.name}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    minWidth: '130px',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span className="font-mono" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-cyan)' }}>
                      /{q.name}
                    </span>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>
                      total {waiting + active + delayed}
                    </span>
                  </div>
                  <div className="font-mono" style={{ display: 'flex', gap: '8px', fontSize: '9px' }}>
                    <span style={{ color: '#38bdf8' }} title="Waiting">W: {waiting}</span>
                    <span style={{ color: '#fbbf24' }} title="Active">A: {active}</span>
                    <span style={{ color: '#c084fc' }} title="Delayed">D: {delayed}</span>
                    {failed > 0 && <span style={{ color: '#f87171' }} title="Failed">F: {failed}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
