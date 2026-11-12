'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { BiophysicalMetrics } from '@/types/peptide';
import { ShieldCheck, Activity, AlertTriangle } from 'lucide-react';

interface RadarProps {
  metrics: BiophysicalMetrics;
}

export const BiophysicalRadar: React.FC<RadarProps> = ({ metrics }) => {
  // Normalize each metric to a 0-100 scale for clean radar visualization
  const data = [
    {
      subject: 'Net Charge',
      value: Math.min(100, Math.max(0, (metrics.netCharge / 10) * 100)),
      raw: `+${metrics.netCharge} e`,
      benchmark: 70
    },
    {
      subject: 'Amphipathicity',
      value: Math.min(100, Math.max(0, metrics.hydrophobicMoment * 130)),
      raw: `${metrics.hydrophobicMoment} μH`,
      benchmark: 75
    },
    {
      subject: 'Hydrophobicity',
      value: Math.min(100, Math.max(0, (metrics.meanHydrophobicity + 0.2) * 100)),
      raw: `${metrics.meanHydrophobicity} <H>`,
      benchmark: 55
    },
    {
      subject: 'Selectivity Index',
      value: metrics.therapeuticSelectivityIndex,
      raw: `${metrics.therapeuticSelectivityIndex}/100`,
      benchmark: 80
    },
    {
      subject: 'Aliphatic Index',
      value: Math.min(100, Math.max(0, (metrics.aliphaticIndex ?? 0) / 150) * 100),
      raw: `${metrics.aliphaticIndex ?? 0}`,
      benchmark: 70
    },
    {
      subject: 'Cell Safety',
      value: metrics.predictedHemolysisRisk === 'Low' ? 90 : metrics.predictedHemolysisRisk === 'Moderate' ? 60 : 30,
      raw: `${metrics.predictedHemolysisRisk} Hemolysis`,
      benchmark: 85
    }
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Biophysical Potency Radar</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Eisenberg Consensus</span>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#475569" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs font-mono">
                      <p className="font-semibold text-cyan-300">{item.subject}</p>
                      <p className="text-slate-200">Value: {item.raw}</p>
                      <p className="text-slate-400 text-[10px]">Normalized Score: {Math.round(item.value)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Radar
              name="SynthiaBio Candidate"
              dataKey="value"
              stroke="#00F0FF"
              fill="#00F0FF"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Safety Badge & Highlight */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400">Therapeutic Index</p>
            <p className="text-xs font-mono font-bold text-cyan-300">{metrics.therapeuticSelectivityIndex} / 100</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <AlertTriangle className={`w-4 h-4 shrink-0 ${
            metrics.predictedHemolysisRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'
          }`} />
          <div>
            <p className="text-[10px] text-slate-400">Hemolysis Risk</p>
            <p className={`text-xs font-mono font-bold ${
              metrics.predictedHemolysisRisk === 'Low' ? 'text-emerald-300' : 'text-amber-300'
            }`}>
              {metrics.predictedHemolysisRisk} Risk
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
