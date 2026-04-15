"use client";

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiveFeedProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemKey?: (item: T, index: number) => string;
  emptyText?: string;
  maxHeight?: number;
  className?: string;
}

export function LiveFeed<T>({
  items,
  renderItem,
  itemKey,
  emptyText = "No activity yet.",
  maxHeight = 480,
  className,
}: LiveFeedProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // User is at top (where new items appear) → auto-scroll stays on.
    // If user scrolled down > 30px, lock.
    setAutoScroll(el.scrollTop < 30);
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [items, autoScroll]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted">
            {emptyText}
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item, i) => (
                <motion.li
                  key={itemKey ? itemKey(item, i) : i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{
                    duration: 0.25,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  layout
                >
                  {renderItem(item, i)}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {!autoScroll && items.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="absolute right-2 top-2 rounded-full border border-border-strong bg-bg-card/90 px-2.5 py-1 text-[11px] text-text-secondary shadow-xl backdrop-blur hover:text-text-primary"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
