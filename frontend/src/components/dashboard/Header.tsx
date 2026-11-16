'use client';

import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-[#161616] border-b border-line">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#f4f4f4]">SynthiaBio</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8a8a8] sm:inline">
            v1.0 • de-novo
          </span>
        </div>

        <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#a8a8a8]">
          <span className="hidden items-center gap-2 md:flex">
            <span className="h-1.5 w-1.5 bg-accent" aria-hidden />
            <span>WHO Priority AMR Crisis Response</span>
          </span>
          <a
            href="https://github.com/Pashinoh/Synthia-Bio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#f4f4f4] underline decoration-[#8d8d8d] underline-offset-4 transition-colors hover:decoration-[#f4f4f4]"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
};