'use client';

import React, { useLayoutEffect } from 'react';
import { BookOpen, Compass, Moon, Monitor, Sun } from 'lucide-react';
import { ThemeMode, usePeptideStore } from '@/store/usePeptideStore';

interface HeaderProps {
  onOpenTutorial?: () => void;
  onStartTour?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ onOpenTutorial, onStartTour }) => {
  const theme = usePeptideStore((s) => s.theme);
  const setTheme = usePeptideStore((s) => s.setTheme);
  const initTheme = usePeptideStore((s) => s.initTheme);

  useLayoutEffect(() => {
    initTheme();
  }, [initTheme]);

  const nextTheme: ThemeMode =
    theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  const cycleTheme = () => {
    setTheme(nextTheme);
  };

  const labelMap: Record<ThemeMode, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System'
  };
  const themeLabel = labelMap[theme];
  const nextThemeLabel = labelMap[nextTheme];

  const themeIcon =
    theme === 'system' ? (
      <Monitor className="h-3 w-3 text-ink-2" aria-hidden />
    ) : theme === 'dark' ? (
      <Moon className="h-3 w-3 text-ink-2" aria-hidden />
    ) : (
      <Sun className="h-3 w-3 text-[#d97706]" aria-hidden />
    );

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

        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2 sm:gap-4">
          <span className="hidden text-ink-3 md:inline">
            WHO Priority AMR Research Workbench
          </span>

          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              aria-label="Start live interactive tour"
              title="Interactive UI Walkthrough"
              className="flex h-8 items-center gap-1.5 border border-line bg-sunken px-2.5 text-ink transition-colors hover:bg-track-hover active:bg-track"
            >
              <Compass className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>Tour</span>
            </button>
          )}

          {onOpenTutorial && (
            <button
              type="button"
              onClick={onOpenTutorial}
              aria-label="Open SynthiaBio reference guide"
              title="SynthiaBio Reference Guide"
              className="flex h-8 items-center gap-1.5 border border-line bg-sunken px-2.5 text-ink transition-colors hover:bg-track-hover active:bg-track"
            >
              <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>Guide</span>
            </button>
          )}

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Theme: ${themeLabel}. Switch to ${nextThemeLabel}`}
            title={`Current: ${themeLabel} · Click for ${nextThemeLabel}`}
            className="flex h-8 items-center gap-1.5 border border-line bg-sunken px-2.5 text-ink transition-colors hover:bg-track-hover active:bg-track"
          >
            {themeIcon} <span>{themeLabel}</span>
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
