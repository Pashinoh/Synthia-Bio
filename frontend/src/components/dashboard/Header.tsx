'use client';

import React, { useLayoutEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeMode, usePeptideStore } from '@/store/usePeptideStore';

export const Header: React.FC = React.memo(() => {
  const theme = usePeptideStore((s) => s.theme);
  const setTheme = usePeptideStore((s) => s.setTheme);
  const initTheme = usePeptideStore((s) => s.initTheme);

  useLayoutEffect(() => {
    initTheme();
  }, [initTheme]);

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-line bg-surface text-ink transition-colors">
      <div className="mx-auto flex h-12 max-w-[1720px] items-center justify-between gap-6 px-3 sm:px-5">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            SynthiaBio
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 sm:inline">
            v1.0 • de-novo
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">
          <span className="hidden items-center gap-2 md:flex">
            <span className="h-1.5 w-1.5 bg-accent" aria-hidden />
            <span>WHO Priority AMR Crisis Response</span>
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-7 items-center gap-1.5 border border-line bg-sunken px-2 text-ink transition-colors hover:bg-track-hover"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3 w-3 text-[#f1c21b]" aria-hidden />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3 w-3 text-ink-2" aria-hidden />
                <span>Dark</span>
              </>
            )}
          </button>

          <a
            href="https://github.com/Pashinoh/Synthia-Bio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline decoration-line-2 underline-offset-4 transition-colors hover:decoration-ink"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
