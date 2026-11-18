import type { ZodType } from "zod";

export const USER_AGENT = "AtlasMundi/1.0 (mapa interativo educacional; RSS e APIs oficiais)";

export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/** fetch com timeout por requisição. Lança HttpError em status != 2xx. */
export async function fetchWithTimeout(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10_000, headers = {} } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, ...headers },
      // o cache é feito em memória por nós; evita cache de fetch do Next
      cache: "no-store",
    });
    if (!res.ok) throw new HttpError(`HTTP ${res.status} em ${url}`, res.status);
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpError(`Timeout (${timeoutMs}ms) em ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, opts?: FetchOptions): Promise<string> {
  const res = await fetchWithTimeout(url, opts);
  return res.text();
}

/** Busca JSON e valida com Zod. Falha de validação vira erro legível. */
export async function fetchJson<T>(url: string, schema: ZodType<T>, opts?: FetchOptions): Promise<T> {
  const res = await fetchWithTimeout(url, {
    ...opts,
    headers: { Accept: "application/json", ...(opts?.headers ?? {}) },
  });
  const data: unknown = await res.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new HttpError(`Resposta inválida de ${url}: ${parsed.error.issues[0]?.message ?? "schema"}`);
  }
  return parsed.data;
}

/** Executa várias promessas e devolve só as que deram certo + erros. */
export async function settle<T>(tasks: Array<Promise<T>>): Promise<{ ok: T[]; errors: string[] }> {
  const results = await Promise.allSettled(tasks);
  const ok: T[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") ok.push(r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  return { ok, errors };
}
