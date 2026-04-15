"use client";

import Link from "next/link";
import { TimeRangeSelector } from "./TimeRangeSelector";
import { useRangeStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const range = useRangeStore((s) => s.range);
  const setRange = useRangeStore((s) => s.setRange);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 glass border-b border-border-subtle",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo rounded-md"
          >
            <div className="relative">
              <div
                className="h-7 w-7 rounded-lg bg-gradient-hero transition-transform group-hover:scale-105"
                aria-hidden
              />
              <div
                className="absolute inset-0 rounded-lg glow-tempo opacity-60 group-hover:opacity-100 transition-opacity"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <div className="font-display text-base font-bold tracking-tight text-text-primary leading-none">
                Tempo
              </div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">
                Benchmark Dashboard
              </div>
            </div>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 justify-center">
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>

        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>
          <Link
            href="https://usesurf.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Powered by Surf
          </Link>
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
