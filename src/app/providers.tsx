"use client";

import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
} from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Auto-refresh: every 90s while the tab is in focus.
            // Backend in-memory cache (per-endpoint TTL) protects surf credits.
            staleTime: 60_000,
            refetchInterval: 90_000,
            refetchIntervalInBackground: false,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
            // Keep the previous data visible while refetching so values don't
            // animate from 0 on every background refresh.
            placeholderData: keepPreviousData,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
