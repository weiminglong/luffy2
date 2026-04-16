"use client";

import Link from "next/link";
import { useEffect, useState, ReactNode } from "react";
import {
  LayoutDashboard,
  Gauge,
  Activity,
  Boxes,
  Coins,
  ArrowLeftRight,
  CircleDollarSign,
  Store,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

const ICON_CLASS = "h-3.5 w-3.5 shrink-0";

const DEFAULT_ITEMS: SidebarItem[] = [
  { id: "hero", label: "Overview", icon: <LayoutDashboard className={ICON_CLASS} /> },
  { id: "cost-benchmark", label: "Benchmark", icon: <Gauge className={ICON_CLASS} /> },
  { id: "chain-health", label: "Chain Health", icon: <Activity className={ICON_CLASS} /> },
  { id: "ecosystem-activity", label: "Ecosystem", icon: <Boxes className={ICON_CLASS} /> },
  { id: "stablecoins", label: "Stablecoins", icon: <Coins className={ICON_CLASS} /> },
  { id: "dex", label: "DEX", icon: <ArrowLeftRight className={ICON_CLASS} /> },
  { id: "tokens", label: "Tokens", icon: <CircleDollarSign className={ICON_CLASS} /> },
  { id: "merchants", label: "Payments", icon: <Store className={ICON_CLASS} /> },
  { id: "transfers", label: "Transfers", icon: <Send className={ICON_CLASS} /> },
];

interface SidebarProps {
  items?: SidebarItem[];
  className?: string;
}

export function Sidebar({ items = DEFAULT_ITEMS, className }: SidebarProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ids = items.map((i) => i.id);

    const compute = () => {
      const anchor = 140;
      let best: { id: string; dist: number } | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top > anchor) continue;
        const dist = anchor - top;
        if (best === null || dist < best.dist) best = { id, dist };
      }
      if (best) setActive(best.id);
      else if (ids.length) setActive(ids[0]);
    };

    compute();
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const interval = window.setInterval(compute, 250);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
    };
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
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-tempo",
                isActive
                  ? "text-text-primary bg-bg-card font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card/60"
              )}
              aria-current={isActive ? "location" : undefined}
            >
              <span
                className={cn(
                  "rounded-full transition-all shrink-0",
                  isActive
                    ? "h-2 w-2 bg-accent-tempo shadow-[0_0_10px_rgba(108,92,231,0.9)]"
                    : "h-1.5 w-1.5 bg-border-strong"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "transition-colors",
                  isActive ? "text-accent-tempo" : "text-text-muted"
                )}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
