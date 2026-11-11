'use client';

import React from 'react';
import { AminoAcidCount } from '@/types/peptide';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Dna } from 'lucide-react';

interface ProfileProps {
  profile: AminoAcidCount[];
}

export const AminoAcidProfile: React.FC<ProfileProps> = ({ profile }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'positive':
        return '#00F0FF'; // Cyan for Lys/Arg
      case 'hydrophobic':
        return '#F59E0B'; // Amber for Leu/Ile/Val/Trp
      case 'negative':
        return '#EF4444'; // Red for Asp/Glu
      case 'hydrophilic':
        return '#3B82F6'; // Blue
      default:
        return '#94A3B8'; // Slate for neutral
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Residue Composition</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Cationic (+)
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Hydrophobic
          </span>
        </div>
      </div>

      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={profile} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="code" tick={{ fill: '#CBD5E1', fontSize: 11, fontFamily: 'monospace' }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as AminoAcidCount;
                  return (
                    <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs font-mono">
                      <p className="font-bold text-cyan-300">{item.name} ({item.code})</p>
                      <p className="text-slate-200">Count: {item.count} ({item.percentage}%)</p>
                      <p className="text-slate-400 text-[10px] capitalize">Class: {item.category}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {profile.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-400 text-center mt-1 font-mono">
        Amphipathic balance: Polycationic facial residues for membrane binding
      </p>
    </div>
  );
};
