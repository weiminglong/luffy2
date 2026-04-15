"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

function formatTimestamp(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function Footer() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setNow(formatTimestamp(new Date()));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="mt-24 border-t border-border-subtle glass">
      <div className="mx-auto max-w-[1440px] px-6 py-10 space-y-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="text-xs text-text-muted">
            Built with Tempo data via Surf
            {now ? ` — last refreshed at ${now}` : ""}
          </div>
          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center gap-4 text-xs"
          >
            <Link
              href="#cost-benchmark"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Methodology
            </Link>
            <Link
              href="https://tempo.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1"
            >
              Tempo <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
            <Link
              href="https://usesurf.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1"
            >
              Surf <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard
                    .writeText(window.location.href)
                    .catch(() => undefined);
                }
              }}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Embed
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-gradient-card p-8 text-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-tempo mb-2">
              Surf
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold text-text-primary">
              Build Your Own Dashboard
            </h3>
            <p className="mt-2 max-w-xl text-sm text-text-secondary">
              Describe your data needs in natural language and Surf generates
              an interactive on-chain dashboard, deployed and ready to share.
            </p>
          </div>
          <Link
            href="https://usesurf.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent-tempo px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-tempo/30 hover:bg-accent-tempo/90 hover:shadow-accent-tempo/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary glow-tempo"
          >
            Build Your Own Dashboard with Surf
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </footer>
  );
}
