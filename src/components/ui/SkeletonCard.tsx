"use client";

import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  variant?: "kpi" | "chart" | "table" | "feed";
  className?: string;
  height?: number;
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-bg-card-hover/60",
        className
      )}
    >
      <div
        className="absolute inset-y-0 -left-full w-full animate-shimmer"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(108,92,231,0.08) 50%, transparent 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}

export function SkeletonCard({
  variant = "kpi",
  className,
  height,
}: SkeletonCardProps) {
  if (variant === "kpi") {
    return (
      <div
        className={cn(
          "card rounded-2xl border border-border-subtle p-6 space-y-4",
          className
        )}
        style={height ? { minHeight: height } : undefined}
        aria-busy
      >
        <ShimmerBar className="h-3 w-24" />
        <ShimmerBar className="h-10 w-40" />
        <ShimmerBar className="h-3 w-16" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div
        className={cn(
          "card rounded-2xl border border-border-subtle p-6 space-y-4",
          className
        )}
        style={{ minHeight: height ?? 320 }}
        aria-busy
      >
        <div className="flex items-center justify-between">
          <ShimmerBar className="h-4 w-40" />
          <ShimmerBar className="h-6 w-24" />
        </div>
        <ShimmerBar className="h-[240px] w-full" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div
        className={cn(
          "card rounded-2xl border border-border-subtle p-6 space-y-3",
          className
        )}
        aria-busy
      >
        <ShimmerBar className="h-4 w-32 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <ShimmerBar className="h-4 w-6" />
            <ShimmerBar className="h-4 flex-1" />
            <ShimmerBar className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // feed
  return (
    <div
      className={cn(
        "card rounded-2xl border border-border-subtle p-6 space-y-4",
        className
      )}
      aria-busy
    >
      <ShimmerBar className="h-4 w-32 mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <ShimmerBar className="h-3 w-3/4" />
          <ShimmerBar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
