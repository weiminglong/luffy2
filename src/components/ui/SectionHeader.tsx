"use client";

import { useState, ReactNode } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };

  return (
    <header
      id={id}
      className={cn(
        "group flex flex-wrap items-end justify-between gap-4 scroll-mt-24",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent-tempo">
            {eyebrow}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[32px] leading-tight font-semibold tracking-tight text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            aria-label={`Copy link to ${title}`}
            onClick={copyLink}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo"
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-accent-positive" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
