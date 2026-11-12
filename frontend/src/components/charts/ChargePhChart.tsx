'use client';

import React from 'react';
import { ChargePhCurve } from '@/types/peptide';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';

interface ChargePhChartProps {
  curve: ChargePhCurve | null;
}

export const ChargePhChart: React.FC<ChargePhChartProps> = ({ curve }) => {
  if (!curve) {
    return (
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col items-center justify-center h-64">
        <p className="text-xs text-slate-500 font-mono">Generate a peptide to view charge-pH curve</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 font-mono">Charge vs pH Titration</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
          pI: {curve.isoelectricPoint.toFixed(2)}
        </span>
      </div>

      <div className="flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve.points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="ph" type="number" domain={[2, 12]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as { ph: number; charge: number };
                  return (
                    <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs font-mono">
                      <p className="text-cyan-300 font-bold">pH {item.ph}</p>
                      <p className="text-slate-200">Charge {item.charge}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line type="monotone" dataKey="charge" stroke="#00F0FF" strokeWidth={2} dot={false} />
            <Dot fill="#00F0FF" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] font-mono text-center">
        <span className="text-slate-400">pH range: 2.0 – 12.0</span>
        <span className="ml-2 text-slate-200">Points: {curve.points.length}</span>
      </div>
    </div>
  );
};
