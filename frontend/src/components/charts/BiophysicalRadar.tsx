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

interface RadarProps {
  metrics: BiophysicalMetrics;
}

const AXIS_NAMES: Record<string, string> = {
  'Net Charge': 'Net charge',
  Amphipathicity: 'Amphipathic',
  Hydrophobicity: 'Hydrophobic',
  'Selectivity Index': 'Selectivity',
  'Aliphatic Index': 'Aliphatic',
  'Cell Safety': 'Host safety'
};

export const BiophysicalRadar: React.FC<RadarProps> = ({ metrics }) => {
  // Normalize each metric to a 0-100 scale for clean radar visualization
  const data = [
    {
      subject: 'Net Charge',
      value: Math.min(100, Math.max(0, (metrics.netCharge / 10) * 100)),
      raw: `+${metrics.netCharge} e`
    },
    {
      subject: 'Amphipathicity',
      value: Math.min(100, Math.max(0, metrics.hydrophobicMoment * 130)),
      raw: `${metrics.hydrophobicMoment} μH`
    },
    {
      subject: 'Hydrophobicity',
      value: Math.min(100, Math.max(0, (metrics.meanHydrophobicity + 0.2) * 100)),
      raw: `${metrics.meanHydrophobicity} ⟨H⟩`
    },
    {
      subject: 'Selectivity Index',
      value: metrics.therapeuticSelectivityIndex,
      raw: `${metrics.therapeuticSelectivityIndex}/100`
    },
    {
      subject: 'Aliphatic Index',
      value: Math.min(100, Math.max(0, (metrics.aliphaticIndex ?? 0) / 150) * 100),
      raw: `${metrics.aliphaticIndex ?? 0}`
    },
    {
      subject: 'Cell Safety',
      value:
        metrics.predictedHemolysisRisk === 'Low'
          ? 90
          : metrics.predictedHemolysisRisk === 'Moderate'
            ? 60
            : 30,
      raw: `${metrics.predictedHemolysisRisk.toLowerCase()} risk`
    }
  ];

  const shortBySubject = new Map<string, string>([
    ['Net Charge', `+${metrics.netCharge} e`],
    ['Amphipathicity', `${metrics.hydrophobicMoment} μH`],
    ['Hydrophobicity', `${metrics.meanHydrophobicity}`],
    ['Selectivity Index', `${metrics.therapeuticSelectivityIndex}`],
    ['Aliphatic Index', `${metrics.aliphaticIndex ?? 0}`],
    ['Cell Safety', metrics.predictedHemolysisRisk.toLowerCase()]
  ]);

  const axisTick = ({ x, y, cx, cy, payload, textAnchor }: any) => {
    const raw = shortBySubject.get(payload.value);
    const below = y >= cy;
    return (
      <g>
        <text
          x={x}
          y={y}
          textAnchor={textAnchor}
          fill="#525252"
          fontSize={9.5}
          fontFamily="var(--font-ibm-plex-sans)"
        >
          {AXIS_NAMES[payload.value] ?? payload.value}
        </text>
        <text
          x={x}
          y={below ? y + 9 : y - 9}
          textAnchor={textAnchor}
          fill="#161616"
          fontSize={9.5}
          fontWeight={600}
          fontFamily="var(--font-ibm-plex-mono)"
        >
          {raw ?? ''}
        </text>
      </g>
    );
  };

  const riskTone =
    metrics.predictedHemolysisRisk === 'High'
      ? 'text-danger'
      : metrics.predictedHemolysisRisk === 'Moderate'
        ? 'text-warn'
        : 'text-ink-2';

  return (
    <section className="flex flex-col bg-surface p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Biophysical profile
        </h3>
        <span className="font-mono text-[10px] text-ink-3">0 – 100</span>
      </div>

      <div className="h-[268px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="52%" data={data}>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis dataKey="subject" tick={axisTick} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as (typeof data)[number];
                return (
                  <div className="bg-stage px-2.5 py-2 font-mono text-[11px] text-[#f4f4f4]">
                    <p className="font-semibold">{AXIS_NAMES[item.subject] ?? item.subject}</p>
                    <p className="text-[#c6c6c6]">{item.raw}</p>
                    <p className="text-[10px] text-[#8d8d8d]">Score {Math.round(item.value)}%</p>
                  </div>
                );
              }}
            />
            <Radar
              name="Candidate"
              dataKey="value"
              stroke="#0f62fe"
              strokeWidth={1.5}
              fill="#0f62fe"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        <span>
          TI <span className="text-ink">{metrics.therapeuticSelectivityIndex}/100</span>
        </span>
        <span className={riskTone}>Hemolysis · {metrics.predictedHemolysisRisk}</span>
      </div>
    </section>
  );
};
