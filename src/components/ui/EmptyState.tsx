"use client";

import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  hint?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title = "No data in this range",
  hint,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 px-6 text-center",
        className
      )}
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-card-hover/60 text-text-muted">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <div className="text-sm font-medium text-text-secondary">{title}</div>
      {hint ? (
        <div className="mt-1 text-xs text-text-muted max-w-xs">{hint}</div>
      ) : null}
    </div>
  );
}
