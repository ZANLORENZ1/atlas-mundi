"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const memory = new Map<string, unknown>();

/** Fetch simples com cache em memória no cliente e função de recarregar. */
export function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>(() => ({
    data: url && memory.has(url) ? (memory.get(url) as T) : null,
    error: null,
    loading: !!url && !memory.has(url),
  }));
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      if (!url) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!opts.refresh && memory.has(url)) {
        setState({ data: memory.get(url) as T, error: null, loading: false });
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const target = opts.refresh ? `${url}${url.includes("?") ? "&" : "?"}refresh=1` : url;
        // o cache fica no servidor; evita que o navegador guarde respostas com falha
        const res = await fetch(target, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as T;
        memory.set(url, data);
        setState({ data, error: null, loading: false });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : "erro", loading: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, ...deps],
  );

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { ...state, reload: () => load({ refresh: true }) };
}
