'use client';

import React from 'react';
import { HelicalWheelProjection } from '@/types/peptide';

interface HelicalWheelChartProps {
  wheel: HelicalWheelProjection | null;
}

export const HelicalWheelChart: React.FC<HelicalWheelChartProps> = ({ wheel }) => {
  const size = 260;
  const center = size / 2;

  if (!wheel) {
    return (
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col items-center justify-center h-64">
        <p className="text-xs text-slate-500 font-mono">Generate a peptide to view helical wheel</p>
      </div>
    );
  }

  const nodes = wheel.nodes;
  const moment = wheel.momentVector;

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 font-mono">Helical Wheel (2D)</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
          {wheel.amphipathicFaceQuality}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {/* Center point */}
          <circle cx={center} cy={center} r={3} fill="#64748B" />

          {/* Moment vector arrow */}
          <line
            x1={center}
            y1={center}
            x2={center + moment.dx * 80}
            y2={center - moment.dy * 80}
            stroke="#EF4444"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />

          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map((node) => {
            const svgRadius = 95;
            const x = center + node.x * svgRadius;
            const y = center - node.y * svgRadius;

            const colorMap: Record<string, string> = {
              hydrophobic: '#F59E0B',
              hydrophilic: '#3B82F6',
              positive: '#00F0FF',
              negative: '#EF4444',
              neutral: '#94A3B8'
            };

            return (
              <g key={node.position}>
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill={colorMap[node.category] || '#94A3B8'}
                  stroke="#090D16"
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="monospace"
                  fill="#090D16"
                  fontWeight="bold"
                >
                  {node.residue}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] font-mono">
        <div className="flex justify-between mb-1">
          <span className="text-slate-400">Moment magnitude</span>
          <span className="text-slate-200">{moment.magnitude}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-slate-400">Moment angle</span>
          <span className="text-slate-200">{moment.angleDeg}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Vector (dx, dy)</span>
          <span className="text-slate-200">({moment.dx}, {moment.dy})</span>
        </div>
      </div>
    </div>
  );
};
