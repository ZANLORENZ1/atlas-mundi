/**
 * Cache em memória com TTL e deduplicação de requisições em andamento.
 * Sem banco de dados: vive no processo do servidor Next.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const TTL = {
  NEWS: 30 * 60 * 1000, // 30 min
  COUNTRY: 24 * 60 * 60 * 1000, // 24 h
  FACTS: 24 * 60 * 60 * 1000,
  CHOROPLETH: 24 * 60 * 60 * 1000,
} as const;

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  opts: { refresh?: boolean } = {},
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (!opts.refresh && hit && hit.expiresAt > now) return hit.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      // stale-if-error: se a fonte falhar e houver um valor antigo, devolve o antigo
      if (hit) {
        console.warn(`[cache] ${key}: fonte falhou, servindo dado expirado`);
        return hit.value;
      }
      throw err;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function cacheStats() {
  return { entries: store.size, inflight: inflight.size };
}
