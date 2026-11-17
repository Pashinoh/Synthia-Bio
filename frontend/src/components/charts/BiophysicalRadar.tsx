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
  previousMetrics?: BiophysicalMetrics | null;
  previousName?: string | null;
}

function formatSignedDelta(delta: number, decimals = 0): string {
  const formatted = decimals > 0 ? Math.abs(delta).toFixed(decimals) : String(Math.round(Math.abs(delta)));
  return delta > 0 ? `+${formatted}` : `-${formatted}`;
}

interface RadarTickProps {
  x?: string | number;
  y?: string | number;
  cy?: string | number;
  textAnchor?: string;
  payload?: { value?: string | number };
}

const AXIS_NAMES: Record<string, string> = {
  'Net Charge': 'Net charge',
  Amphipathicity: 'Amphipathic',
  Hydrophobicity: 'Hydrophobic',
  'Selectivity Index': 'Selectivity',
  'Aliphatic Index': 'Aliphatic',
  'Cell Safety': 'Host safety'
};

export const BiophysicalRadar: React.FC<RadarProps> = React.memo(
  ({ metrics, previousMetrics, previousName }) => {
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

  const axisTick = ({ x = 0, y = 0, cy = 0, payload, textAnchor }: RadarTickProps) => {
    const numX = Number(x);
    const numY = Number(y);
    const numCy = Number(cy);
    const anchor =
      textAnchor === 'start' || textAnchor === 'end' || textAnchor === 'inherit'
        ? textAnchor
        : 'middle';
    const subject = String(payload?.value ?? '');
    const raw = shortBySubject.get(subject);
    const below = numY >= numCy;
    return (
      <g>
        <text
          x={numX}
          y={numY}
          textAnchor={anchor}
          fill="var(--ink-2)"
          fontSize={9.5}
          fontFamily="var(--font-ibm-plex-sans)"
        >
          {AXIS_NAMES[subject] ?? subject}
        </text>
        <text
          x={numX}
          y={below ? numY + 9 : numY - 9}
          textAnchor={anchor}
          fill="var(--ink)"
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

  const tiDelta = previousMetrics
    ? metrics.therapeuticSelectivityIndex - previousMetrics.therapeuticSelectivityIndex
    : 0;
  const chargeDelta = previousMetrics ? metrics.netCharge - previousMetrics.netCharge : 0;
  const muHDelta = previousMetrics
    ? Number((metrics.hydrophobicMoment - previousMetrics.hydrophobicMoment).toFixed(3))
    : 0;
  const riskChanged =
    Boolean(previousMetrics) &&
    previousMetrics?.predictedHemolysisRisk !== metrics.predictedHemolysisRisk;
  const hasAnyDelta = tiDelta !== 0 || chargeDelta !== 0 || Math.abs(muHDelta) >= 0.001 || riskChanged;

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
            <PolarGrid stroke="var(--line)" />
            <PolarAngleAxis dataKey="subject" tick={axisTick} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as (typeof data)[number];
                return (
                  <div className="border border-line bg-stage px-2.5 py-2 font-mono text-[11px] text-[#f4f4f4]">
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
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="var(--accent)"
              fillOpacity={0.14}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 space-y-1.5 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span>
            TI <span className="text-ink">{metrics.therapeuticSelectivityIndex}/100</span>
            {tiDelta !== 0 && (
              <span
                className={`ml-1.5 font-semibold ${tiDelta > 0 ? 'text-accent' : 'text-danger'}`}
              >
                ({formatSignedDelta(tiDelta)})
              </span>
            )}
          </span>
          <span className={riskTone}>
            Hemolysis · {metrics.predictedHemolysisRisk}
            {riskChanged && previousMetrics ? ` (was ${previousMetrics.predictedHemolysisRisk})` : ''}
          </span>
        </div>

        {hasAnyDelta && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-sunken px-2 py-1 text-[9.5px] normal-case tracking-normal text-ink-2">
            <span className="font-mono uppercase tracking-[0.08em] text-accent">
              Delta vs {previousName || 'prev'}
            </span>
            {chargeDelta !== 0 && (
              <span className="font-mono tabular-nums">
                Charge{' '}
                <strong className={chargeDelta > 0 ? 'text-accent' : 'text-danger'}>
                  {formatSignedDelta(chargeDelta)} e
                </strong>
              </span>
            )}
            {Math.abs(muHDelta) >= 0.001 && (
              <span className="font-mono tabular-nums">
                μH{' '}
                <strong className={muHDelta > 0 ? 'text-accent' : 'text-danger'}>
                  {formatSignedDelta(muHDelta, 3)}
                </strong>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
});

BiophysicalRadar.displayName = 'BiophysicalRadar';
