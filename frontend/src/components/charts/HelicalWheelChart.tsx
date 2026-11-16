'use client';

import React from 'react';
import { HelicalWheelProjection } from '@/types/peptide';

interface HelicalWheelChartProps {
  wheel: HelicalWheelProjection | null;
}

const NODE_COLORS: Record<string, string> = {
  hydrophobic: '#161616',
  hydrophilic: '#c6c6c6',
  positive: '#0f62fe',
  negative: '#da1e28',
  neutral: '#c6c6c6'
};

export const HelicalWheelChart: React.FC<HelicalWheelChartProps> = ({ wheel }) => {
  const size = 260;
  const center = size / 2;

  if (!wheel) {
    return (
      <section className="flex flex-col bg-surface p-5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Helical wheel
        </h3>
        <p className="py-4 font-mono text-[11px] text-ink-3">Awaits stability validation</p>
      </section>
    );
  }

  const { nodes, momentVector } = wheel;

  return (
    <section className="flex flex-col bg-surface p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Helical wheel
        </h3>
        <span className="font-mono text-[10px] text-ink-3">{wheel.amphipathicFaceQuality}</span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="h-auto w-full max-w-[260px]"
          role="img"
          aria-label="Helical wheel projection"
        >
          <circle cx={center} cy={center} r={95} fill="none" stroke="#e0e0e0" strokeDasharray="2 3" />
          <circle cx={center} cy={center} r={2} fill="#8d8d8d" />

          <defs>
            <marker id="od-moment-arrow" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#161616" />
            </marker>
          </defs>

          <line
            x1={center}
            y1={center}
            x2={center + momentVector.dx * 80}
            y2={center - momentVector.dy * 80}
            stroke="#161616"
            strokeWidth={1.5}
            markerEnd="url(#od-moment-arrow)"
          />

          {nodes.map((node) => {
            const svgRadius = 95;
            const x = center + node.x * svgRadius;
            const y = center - node.y * svgRadius;
            const fill = NODE_COLORS[node.category] ?? '#c6c6c6';
            const dark = node.category === 'positive' || node.category === 'negative' || node.category === 'hydrophobic';

            return (
              <g key={node.position}>
                <circle cx={x} cy={y} r={7} fill={fill} stroke="#ffffff" strokeWidth={1.5} />
                <text
                  x={x}
                  y={y + 3.5}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--font-ibm-plex-mono)"
                  fontWeight={600}
                  fill={dark ? '#ffffff' : '#161616'}
                >
                  {node.residue}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        <span>
          μH <span className="text-ink">{momentVector.magnitude}</span>
        </span>
        <span>
          <span className="text-ink">{momentVector.angleDeg}°</span>
        </span>
        <span>
          ({momentVector.dx}, {momentVector.dy})
        </span>
      </div>
    </section>
  );
};
