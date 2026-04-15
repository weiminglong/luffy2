/**
 * Generic fetcher for TanStack Query.
 * Throws on non-2xx. Parses JSON response.
 */
export async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.text();
      detail = body ? ` — ${body.slice(0, 200)}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Request to ${path} failed: ${res.status} ${res.statusText}${detail}`);
  }

  return (await res.json()) as T;
}
