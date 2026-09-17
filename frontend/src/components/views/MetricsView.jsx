import React from 'react';
import { 
  BarChart3, 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  ShieldCheck,
  Target,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { MetricTile } from '../ui/MetricTile';
import { QueueDepthChart } from '../QueueDepthChart';

export function MetricsView({
  metrics,
  depthHistory = [],
  queues = []
}) {
  const throughput = metrics?.throughput ?? 0;
  const avgLatency = metrics?.avgLatency ?? 0;
  const stalledCount = metrics?.stalledCount ?? 0;
  const maxWaitByPriority = metrics?.maxWaitByPriority || {};
  const priorityBands = metrics?.maxWaitByPriorityBand || {
    p1_2: 0,
    p3_4: 0,
    p5_6: 0,
    p7_10: 0
  };
  const starvationBoosts = metrics?.starvationBoosts ?? 0;
  const schedulingPrecision = metrics?.schedulingPrecision || {
    avgDeltaMs: 0,
    minDeltaMs: 0,
    maxDeltaMs: 0,
    evaluatedCount: 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Metric Tiles Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <MetricTile
          label="Throughput"
          value={throughput}
          unit="jobs / min"
          status={throughput > 0 ? 'healthy' : 'default'}
          icon={Zap}
          subtext="Completed jobs in last 60s"
        />

        <MetricTile
          label="Average Execution Latency"
          value={avgLatency}
          unit="ms"
          status="default"
          icon={Clock}
          subtext="Computed from recent worker runs"
        />

        <MetricTile
          label="Stalled Tasks"
          value={stalledCount}
          status={stalledCount > 0 ? 'warning' : 'healthy'}
          icon={AlertTriangle}
          subtext="Detected lock timeouts"
        />

        <MetricTile
          label="Anti-Starvation Boosts"
          value={starvationBoosts}
          status={starvationBoosts > 0 ? 'active' : 'default'}
          icon={ArrowUpRight}
          subtext="Low-priority tasks aged to P1"
        />
      </div>

      {/* Main Queue Depth History Chart */}
      <div style={{ height: '340px' }}>
        <QueueDepthChart history={depthHistory} queues={queues} />
      </div>

      {/* Two Column Section: Anti-Starvation / Priority Bands & Scheduling Precision */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
        {/* Anti-Starvation & Priority Wait Distribution */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={15} color="#10b981" />
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Queue Starvation Prevention (Wait Time by Band)
              </span>
            </div>
            <span className="font-mono" style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1px 6px', borderRadius: '3px' }}>
              Priority Aging Active
            </span>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            BullMQ tasks waiting past 10s progressively boost by one tier every 5s. The counters below show the observed wait time and aging boosts for the original priority band.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {[
              { band: 'P1–P2 (Urgent)', val: priorityBands.p1_2, color: '#f87171', desc: 'VIP / Critical' },
              { band: 'P3–P4 (High)', val: priorityBands.p3_4, color: '#fbbf24', desc: 'Elevated Priority' },
              { band: 'P5–P6 (Normal)', val: priorityBands.p5_6, color: '#60a5fa', desc: 'Standard Work' },
              { band: 'P7–P10 (Low)', val: priorityBands.p7_10, color: '#a855f7', desc: 'Background / Bulk (Bounded by Aging)' },
            ].map(row => {
              const maxVal = Math.max(priorityBands.p1_2, priorityBands.p3_4, priorityBands.p5_6, priorityBands.p7_10, 50);
              const pct = Math.min(100, Math.max(8, (row.val / maxVal) * 100));

              return (
                <div key={row.band} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ width: '130px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {row.band}
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px', height: '14px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: row.color,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', fontWeight: 700, color: row.color }}>
                    {row.val} ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheduling Precision Inspector */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={15} color="var(--accent)" />
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Delayed Scheduling Precision
              </span>
            </div>
            <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              Actual vs Scheduled (Delta)
            </span>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            Measures the latency drift: <code style={{ color: 'var(--accent)' }}>actualStartedAt - scheduledAt</code> in milliseconds.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Avg Drift</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>
                +{schedulingPrecision.avgDeltaMs} ms
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Min Drift</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
                +{schedulingPrecision.minDeltaMs} ms
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Max Drift</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>
                +{schedulingPrecision.maxDeltaMs} ms
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 'auto' }}>
            <Sparkles size={12} color="#10b981" />
            <span>Tested precision tolerance: &lt; 50ms under standard concurrency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
