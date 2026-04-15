"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  label: string;
}

const DEFAULT_ITEMS: SidebarItem[] = [
  { id: "hero", label: "Hero" },
  { id: "cost-benchmark", label: "Cost Benchmark" },
  { id: "chain-health", label: "Chain Health" },
  { id: "stablecoins", label: "Stablecoins" },
  { id: "dex", label: "DEX" },
  { id: "merchants", label: "Merchants (MPP)" },
  { id: "transfers", label: "Transfers" },
];

interface SidebarProps {
  items?: SidebarItem[];
  className?: string;
}

export function Sidebar({ items = DEFAULT_ITEMS, className }: SidebarProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      {
        rootMargin: "-96px 0px -60% 0px",
        threshold: [0, 0.25, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
      setActive(id);
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:block sticky top-20 self-start w-[200px] shrink-0 py-6",
        className
      )}
      aria-label="Section navigation"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3 px-3">
        Sections
      </div>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo",
                isActive
                  ? "text-text-primary bg-bg-card"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card/60"
              )}
              aria-current={isActive ? "location" : undefined}
            >
              <span
                className={cn(
                  "h-1 w-1 rounded-full transition-all",
                  isActive
                    ? "bg-accent-tempo shadow-[0_0_8px_rgba(108,92,231,0.8)]"
                    : "bg-border-strong"
                )}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
