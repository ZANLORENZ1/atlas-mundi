import { z } from "zod";
import { cached, TTL } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import { NO_WORLD_BANK, toWorldBankCode } from "@/lib/isoMap";
import type { Indicator, IndicatorKey, IndicatorsResponse, SeriesPoint } from "@/types";

const BASE = "https://api.worldbank.org/v2";
const SOURCE = "Banco Mundial";

export const WB_INDICATORS: Record<string, IndicatorKey> = {
  "SP.POP.TOTL": "population",
  "AG.SRF.TOTL.K2": "area",
  "EN.POP.DNST": "density",
  "NY.GDP.MKTP.CD": "gdp",
  "NY.GDP.PCAP.CD": "gdpPerCapita",
  "NY.GDP.MKTP.KD.ZG": "gdpGrowth",
  "FP.CPI.TOTL.ZG": "inflation",
  "SL.UEM.TOTL.ZS": "unemployment",
  "SP.DYN.LE00.IN": "lifeExpectancy",
  "SI.POV.GINI": "gini",
};

const RowSchema = z.object({
  indicator: z.object({ id: z.string(), value: z.string().optional() }),
  countryiso3code: z.string().optional(),
  date: z.string(),
  value: z.number().nullable(),
});

const ResponseSchema = z.tuple([z.record(z.string(), z.unknown()), z.array(RowSchema).nullable()]).or(
  z.array(z.unknown()),
);

type Row = z.infer<typeof RowSchema>;

/**
 * A API do Banco Mundial responde rápido a uma requisição por vez, mas
 * estrangula requisições paralelas. Limitamos a concorrência a 2.
 */
let active = 0;
const queue: Array<() => void> = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

async function fetchRows(code: string): Promise<Row[]> {
  const ids = Object.keys(WB_INDICATORS).join(";");
  const url = `${BASE}/country/${encodeURIComponent(code)}/indicator/${ids}?source=2&format=json&per_page=5000&date=1994:2030`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await withSlot(() => fetchJson(url, ResponseSchema, { timeoutMs: 25_000 }));
      const rows = Array.isArray(data) && data.length >= 2 ? data[1] : null;
      if (!Array.isArray(rows)) return [];
      return rows.map((r) => RowSchema.parse(r));
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

const EMPTY: Indicator = { value: null, year: null, source: SOURCE };

function latest(rows: Row[], indicatorId: string): Indicator {
  const sorted = rows
    .filter((r) => r.indicator.id === indicatorId && r.value !== null)
    .sort((a, b) => Number(b.date) - Number(a.date));
  const top = sorted[0];
  return top ? { value: top.value, year: Number(top.date), source: SOURCE } : EMPTY;
}

function series(rows: Row[], indicatorId: string): SeriesPoint[] {
  return rows
    .filter((r) => r.indicator.id === indicatorId && r.value !== null)
    .map((r) => ({ year: Number(r.date), value: r.value as number }))
    .sort((a, b) => a.year - b.year);
}

function emptyIndicators(): Record<IndicatorKey, Indicator> {
  return {
    population: EMPTY,
    area: EMPTY,
    density: EMPTY,
    gdp: EMPTY,
    gdpPerCapita: EMPTY,
    gdpGrowth: EMPTY,
    inflation: EMPTY,
    unemployment: EMPTY,
    lifeExpectancy: EMPTY,
    hdi: { value: null, year: null, source: "PNUD (via Wikidata)" },
    gini: EMPTY,
  };
}

function buildIndicators(rows: Row[]): Record<IndicatorKey, Indicator> {
  const out = emptyIndicators();
  for (const [id, key] of Object.entries(WB_INDICATORS)) {
    out[key] = latest(rows, id);
  }
  return out;
}

const getWorldRows = () => cached("wb:WLD", TTL.COUNTRY, () => fetchRows("WLD"));

/** Indicadores e séries para um país (alpha-3 ISO). */
export function getIndicators(cca3: string): Promise<IndicatorsResponse> {
  const code = cca3.toUpperCase();
  return cached(`wb:${code}`, TTL.COUNTRY, async () => {
    const wbCode = toWorldBankCode(code);
    let rows: Row[] = [];
    let available = !NO_WORLD_BANK.has(code);
    if (available) {
      // Se a API falhar, propaga o erro para não guardar uma resposta vazia por 24 h.
      rows = await fetchRows(wbCode);
      available = rows.some((r) => r.value !== null);
    }
    let worldRows: Row[] = [];
    try {
      worldRows = await getWorldRows();
    } catch (err) {
      console.warn("[worldBank] WLD:", err instanceof Error ? err.message : err);
    }
    const worldInd = buildIndicators(worldRows);
    return {
      code,
      available,
      indicators: buildIndicators(rows),
      world: {
        gdpPerCapita: worldInd.gdpPerCapita,
        gdpGrowth: worldInd.gdpGrowth,
        inflation: worldInd.inflation,
        unemployment: worldInd.unemployment,
        lifeExpectancy: worldInd.lifeExpectancy,
        density: worldInd.density,
        population: worldInd.population,
      },
      series: {
        population: series(rows, "SP.POP.TOTL"),
        gdp: series(rows, "NY.GDP.MKTP.CD"),
        gdpPerCapita: series(rows, "NY.GDP.PCAP.CD"),
        worldGdpPerCapita: series(worldRows, "NY.GDP.PCAP.CD"),
        worldPopulation: series(worldRows, "SP.POP.TOTL"),
      },
    };
  });
}

/** Valor mais recente de um indicador para todos os países (choropleth). */
export function getIndicatorForAll(indicatorId: string): Promise<Record<string, { value: number; year: number | null }>> {
  return cached(`wb:all:${indicatorId}`, TTL.CHOROPLETH, async () => {
    const url = `${BASE}/country/all/indicator/${indicatorId}?mrnev=1&format=json&per_page=400`;
    const data = await withSlot(() => fetchJson(url, ResponseSchema, { timeoutMs: 30_000 }));
    const rows = Array.isArray(data) && data.length >= 2 ? data[1] : null;
    const out: Record<string, { value: number; year: number | null }> = {};
    if (!Array.isArray(rows)) return out;
    for (const raw of rows) {
      const p = RowSchema.safeParse(raw);
      if (!p.success || p.data.value === null || !p.data.countryiso3code) continue;
      const iso = p.data.countryiso3code === "XKX" ? "UNK" : p.data.countryiso3code;
      out[iso] = { value: p.data.value, year: Number(p.data.date) || null };
    }
    return out;
  });
}
