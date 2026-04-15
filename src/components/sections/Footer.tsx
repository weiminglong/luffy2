"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

function formatTimestamp(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const LEFT_LINKS: Array<{ label: string; href: string; external?: boolean }> = [
  { label: "Docs", href: "https://usesurf.ai", external: true },
  { label: "API", href: "https://usesurf.ai", external: true },
  { label: "GitHub", href: "https://github.com", external: true },
  { label: "Methodology", href: "#cost-benchmark" },
];

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
      <div className="mx-auto max-w-[1440px] px-6 py-12 space-y-10">
        {/* CTA card */}
        <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-card p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent-tempo/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent-positive/20 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-tempo/30 bg-accent-tempo/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-tempo">
              Surf
            </div>
            <div className="space-y-3 max-w-2xl">
              <h3 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                Build Your Own Dashboard
              </h3>
              <p className="text-sm md:text-base text-text-secondary">
                Describe your on-chain data needs in natural language — Surf
                generates an interactive dashboard and deploys it, ready to
                share.
              </p>
            </div>
            <Link
              href="https://usesurf.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              style={{
                background:
                  "linear-gradient(135deg, #6C5CE7 0%, #00CEC9 100%)",
                boxShadow:
                  "0 10px 40px -12px rgba(108,92,231,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full ring-1 ring-white/20 transition-opacity group-hover:ring-white/40"
              />
              <span className="relative">Build Your Own Dashboard with Surf</span>
              <ArrowRight
                className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-6 pt-2 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="h-7 w-7 rounded-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #6C5CE7 0%, #00CEC9 100%)",
                  }}
                  aria-hidden
                />
                <div
                  className="absolute inset-0 rounded-lg opacity-60 blur-md"
                  style={{
                    background:
                      "linear-gradient(135deg, #6C5CE7 0%, #00CEC9 100%)",
                  }}
                  aria-hidden
                />
              </div>
              <div className="leading-tight">
                <div className="font-display text-sm font-bold tracking-tight text-text-primary">
                  Tempo
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  Benchmark
                </div>
              </div>
            </div>
            <div className="hidden md:block h-8 w-px bg-border-subtle" />
            <div className="text-xs text-text-muted">
              Built with Tempo data via{" "}
              <Link
                href="https://usesurf.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Surf
              </Link>
              {now ? ` · last refreshed at ${now}` : ""}
            </div>
          </div>

          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center gap-5 text-xs"
          >
            {LEFT_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
                className="group inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                {l.label}
                {l.external ? (
                  <ExternalLink
                    className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity"
                    aria-hidden
                  />
                ) : null}
              </Link>
            ))}
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
      </div>
    </footer>
  );
}
