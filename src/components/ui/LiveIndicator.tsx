"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Shows "● Live · Updated 23s ago", subscribed to the most recent
 * QueryClient cache update across all queries.
 */
export function LiveIndicator({ className }: { className?: string }) {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(() => Date.now());
  const [, tick] = useState(0);

  // Defer all timestamp rendering until after hydration to avoid SSR mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to cache updates
  useEffect(() => {
    const cache = qc.getQueryCache();
    const unsub = cache.subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success") {
        setLastUpdate(Date.now());
      }
    });
    return unsub;
  }, [qc]);

  // Tick every second so the relative timestamp updates
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("inline-flex items-center gap-2 text-[11px] text-text-muted", className)} aria-hidden>
        <span className="h-2 w-2 rounded-full bg-text-muted" />
        <span className="hidden sm:inline uppercase tracking-wider">Live</span>
      </div>
    );
  }

  const ageSec = Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000));
  const label =
    ageSec < 5 ? "just now"
    : ageSec < 60 ? `${ageSec}s ago`
    : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m ago`
    : `${Math.floor(ageSec / 3600)}h ago`;

  const fresh = ageSec < 120;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-medium tabular-nums",
        fresh ? "text-accent-positive" : "text-text-muted",
        className
      )}
      title={`Last data refresh: ${new Date(lastUpdate).toLocaleTimeString()}`}
    >
      <span className="relative flex h-2 w-2">
        {fresh && (
          <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-accent-positive opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            fresh ? "bg-accent-positive" : "bg-text-muted"
          )}
        />
      </span>
      <span className="hidden sm:inline uppercase tracking-wider">Live</span>
      <span className="hidden md:inline text-text-muted">·</span>
      <span className="hidden md:inline">Updated {label}</span>
    </div>
  );
}
