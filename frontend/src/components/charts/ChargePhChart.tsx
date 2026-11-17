'use client';

import React from 'react';
import { ChargePhCurve } from '@/types/peptide';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ChargePhChartProps {
  curve: ChargePhCurve | null;
}

export const ChargePhChart: React.FC<ChargePhChartProps> = React.memo(({ curve }) => {
  if (!curve) {
    return (
      <section className="flex flex-col bg-surface p-5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Charge vs pH
        </h3>
        <p className="py-4 font-mono text-[11px] text-ink-3">Awaits stability validation</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col bg-surface p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Charge vs pH
        </h3>
        <span className="font-mono text-[10px] text-ink-3">pI {curve.isoelectricPoint.toFixed(2)}</span>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve.points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="ph"
              type="number"
              domain={[2, 12]}
              tick={{ fill: 'var(--ink-3)', fontSize: 10, fontFamily: 'var(--font-ibm-plex-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--line-2)' }}
            />
            <YAxis
              tick={{ fill: 'var(--ink-3)', fontSize: 10, fontFamily: 'var(--font-ibm-plex-mono)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'var(--line-2)', strokeDasharray: '2 2' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as { ph: number; charge: number };
                return (
                  <div className="border border-line bg-stage px-2.5 py-2 font-mono text-[11px] text-[#f4f4f4]">
                    <p className="font-semibold">pH {item.ph}</p>
                    <p className="text-[#c6c6c6]">Charge {item.charge}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              x={curve.isoelectricPoint}
              stroke="var(--ink-2)"
              strokeDasharray="3 3"
              label={{
                value: 'pI',
                position: 'insideTopRight',
                fill: 'var(--ink-2)',
                fontSize: 10,
                fontFamily: 'var(--font-ibm-plex-mono)'
              }}
            />
            <Line
              type="monotone"
              dataKey="charge"
              stroke="var(--accent)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        <span>pH 2 – 12</span>
        <span>{curve.points.length} points</span>
      </div>
    </section>
  );
});

ChargePhChart.displayName = 'ChargePhChart';
