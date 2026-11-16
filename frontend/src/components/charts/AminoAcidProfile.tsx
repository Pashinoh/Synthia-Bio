'use client';

import React from 'react';
import { AminoAcidCount } from '@/types/peptide';

interface ProfileProps {
  profile: AminoAcidCount[];
}

type Bucket = { key: string; label: string; tone: string; count: number; codes: string[] };

export const AminoAcidProfile: React.FC<ProfileProps> = ({ profile }) => {
  const buckets: Bucket[] = [
    { key: 'cationic', label: 'Cationic', tone: 'bg-accent', count: 0, codes: [] },
    { key: 'hydrophobic', label: 'Hydrophobic', tone: 'bg-ink', count: 0, codes: [] },
    { key: 'neutral', label: 'Neutral / anionic', tone: 'bg-line-2', count: 0, codes: [] }
  ];

  profile.forEach((row) => {
    const bucket =
      row.category === 'positive'
        ? buckets[0]
        : row.category === 'hydrophobic'
          ? buckets[1]
          : buckets[2];
    bucket.count += row.count;
    if (row.count > 0) bucket.codes.push(`${row.code}${row.count > 1 ? `×${row.count}` : ''}`);
  });

  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0) || 1;

  return (
    <section className="flex flex-col bg-surface p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Residue composition
        </h3>
        <span className="font-mono text-[10px] text-ink-3">{total} residues</span>
      </div>

      {/* Stacked distribution */}
      <div className="flex gap-0.5" role="img" aria-label="Residue class distribution">
        {buckets
          .filter((bucket) => bucket.count > 0)
          .map((bucket) => {
            const pct = Math.round((bucket.count / total) * 100);
            return (
              <div
                key={bucket.key}
                title={`${bucket.label}: ${bucket.count} (${pct}%)`}
                className={`h-2 ${bucket.tone}`}
                style={{ width: `${(bucket.count / total) * 100}%` }}
              />
            );
          })}
      </div>

      {/* Legend */}
      <ul className="mt-4 flex-1 space-y-2.5">
        {buckets.map((bucket) => {
          const pct = Math.round((bucket.count / total) * 100);
          return (
            <li key={bucket.key} className="flex items-start gap-2.5">
              <span className={`mt-1 h-2 w-2 shrink-0 ${bucket.tone}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-medium text-ink">{bucket.label}</span>
                  <span className="font-mono text-[10px] tabular-nums text-ink-2">
                    {bucket.count} · {pct}%
                  </span>
                </div>
                <p className="truncate font-mono text-[10px] text-ink-3">
                  {bucket.codes.length > 0 ? bucket.codes.join(' ') : '—'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        Cationic : hydrophobic {buckets[0].count} : {buckets[1].count}
      </p>
    </section>
  );
};
