import { z } from "zod";
import { cached, TTL } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import type { FactCard, TimelineEvent } from "@/types";

const ENDPOINT = "https://query.wikidata.org/sparql";

const BindingValue = z.object({ value: z.string(), type: z.string().optional() });
const SparqlSchema = z.object({
  results: z.object({ bindings: z.array(z.record(z.string(), BindingValue)) }),
});
type Binding = Record<string, { value: string }>;

async function sparql(query: string, timeoutMs = 20_000): Promise<Binding[]> {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, SparqlSchema, {
    timeoutMs,
    headers: { Accept: "application/sparql-results+json" },
  });
  return data.results.bindings;
}

const LABELS = `SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }`;

export interface CountryEntity {
  qid: string;
  ptTitle: string | null;
  enTitle: string | null;
  inception: string | null;
  hdi: { value: number; year: number } | null;
}

/** Entidade do país no Wikidata via ISO alpha-2 (P297). */
export function getCountryEntity(cca2: string): Promise<CountryEntity | null> {
  const code = cca2.toUpperCase();
  return cached(`wd:entity:${code}`, TTL.FACTS, async () => {
    const q = `
SELECT ?country ?ptTitle ?enTitle ?inception ?hdi ?hdiDate ?sl WHERE {
  ?country wdt:P297 "${code}" ; wikibase:sitelinks ?sl .
  OPTIONAL { ?ptArt schema:about ?country ; schema:isPartOf <https://pt.wikipedia.org/> ; schema:name ?ptTitle . }
  OPTIONAL { ?enArt schema:about ?country ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enTitle . }
  OPTIONAL { ?country wdt:P571 ?inception . }
  OPTIONAL { ?country p:P1081 ?hs . ?hs ps:P1081 ?hdi . OPTIONAL { ?hs pq:P585 ?hdiDate . } }
} ORDER BY DESC(?sl) LIMIT 60`;
    const rows = await sparql(q, 15_000);
    if (!rows.length) return null;
    const first = rows[0];
    const qid = first.country.value.split("/").pop() ?? "";
    const sameEntity = rows.filter((r) => r.country.value === first.country.value);
    let hdi: CountryEntity["hdi"] = null;
    for (const r of sameEntity) {
      if (!r.hdi) continue;
      const v = Number(r.hdi.value);
      const y = r.hdiDate ? new Date(r.hdiDate.value).getUTCFullYear() : 0;
      if (!Number.isFinite(v)) continue;
      if (!hdi || y > hdi.year) hdi = { value: v, year: y };
    }
    return {
      qid,
      ptTitle: first.ptTitle?.value ?? null,
      enTitle: first.enTitle?.value ?? null,
      inception: first.inception?.value ?? null,
      hdi,
    };
  });
}

function qidOf(uri: string): string {
  return uri.split("/").pop() ?? uri;
}

function thumb(url: string | undefined, width = 480): string | null {
  if (!url) return null;
  // Commons: usa Special:FilePath com width para miniaturas leves
  const name = decodeURIComponent(url.split("/").pop() ?? "");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`;
}

function toCards(rows: Binding[], key = "item"): FactCard[] {
  const seen = new Set<string>();
  const out: FactCard[] = [];
  for (const r of rows) {
    const uri = r[key]?.value;
    if (!uri) continue;
    const id = qidOf(uri);
    if (seen.has(id)) continue;
    const label = r[`${key}Label`]?.value;
    if (!label || /^Q\d+$/.test(label)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      description: r[`${key}Description`]?.value ?? r.desc?.value ?? null,
      image: thumb(r.image?.value),
      url: r.article?.value ?? `https://www.wikidata.org/wiki/${id}`,
      year: r.year ? new Date(r.year.value).getUTCFullYear() : null,
    });
  }
  return out;
}

/** Patrimônios Mundiais da UNESCO no país. */
export function getUnescoSites(qid: string): Promise<FactCard[]> {
  return cached(`wd:unesco:${qid}`, TTL.FACTS, async () => {
    const q = `
SELECT ?item ?itemLabel ?itemDescription ?image ?year ?article WHERE {
  ?item wdt:P1435 wd:Q9259 ; wdt:P17 wd:${qid} .
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?item p:P1435 ?s . ?s ps:P1435 wd:Q9259 ; pq:P580 ?year . }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> . }
  ${LABELS}
} LIMIT 40`;
    return toCards(await sparql(q)).slice(0, 12);
  });
}

/** Pratos típicos (origem = país). */
export function getDishes(qid: string): Promise<FactCard[]> {
  return cached(`wd:dishes:${qid}`, TTL.FACTS, async () => {
    const q = `
SELECT ?item ?itemLabel ?itemDescription ?image ?article ?sl WHERE {
  ?item wdt:P495 wd:${qid} ; wdt:P31/wdt:P279* wd:Q746549 ; wikibase:sitelinks ?sl .
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> . }
  ${LABELS}
} ORDER BY DESC(?sl) LIMIT 10`;
    return toCards(await sparql(q));
  });
}

/** Esportes com seleção nacional (ordenados pela relevância das seleções). */
export function getSports(qid: string): Promise<FactCard[]> {
  return cached(`wd:sports:${qid}`, TTL.FACTS, async () => {
    const q = `
SELECT ?item ?itemLabel ?image (MAX(?sl) AS ?score) WHERE {
  ?team wdt:P31/wdt:P279* wd:Q1194951 ; wdt:P17 wd:${qid} ; wdt:P641 ?item ; wikibase:sitelinks ?sl .
  OPTIONAL { ?item wdt:P18 ?image . }
  ${LABELS}
} GROUP BY ?item ?itemLabel ?image ORDER BY DESC(?score) LIMIT 8`;
    return toCards(await sparql(q));
  });
}

/** Personalidades mais conhecidas (por número de artigos na Wikipédia). */
export function getPeople(qid: string): Promise<FactCard[]> {
  return cached(`wd:people:${qid}`, TTL.FACTS, async () => {
    const q = `
SELECT ?item ?itemLabel ?itemDescription ?image ?article WHERE {
  ?item wdt:P27 wd:${qid} ; wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl .
  FILTER(?sl > 120)
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> . }
  ${LABELS}
} ORDER BY DESC(?sl) LIMIT 10`;
    return toCards(await sparql(q, 25_000));
  });
}

/** Eventos históricos marcantes ligados ao país. */
export function getEvents(qid: string): Promise<TimelineEvent[]> {
  return cached(`wd:events:${qid}`, TTL.FACTS, async () => {
    const q = `
SELECT ?item ?itemLabel ?date ?typeLabel ?article ?sl WHERE {
  VALUES ?type { wd:Q198 wd:Q178561 wd:Q10931 wd:Q124734 wd:Q45382 wd:Q2223653 wd:Q3002772 wd:Q7944 wd:Q8065 wd:Q49773 wd:Q1190554 wd:Q175331 wd:Q1261499 wd:Q464980 wd:Q189760 wd:Q131569 wd:Q2334719 }
  ?item wdt:P31 ?type ; wikibase:sitelinks ?sl .
  { ?item wdt:P17 wd:${qid} . } UNION { ?item wdt:P710 wd:${qid} . } UNION { ?item wdt:P276 wd:${qid} . }
  ?item wdt:P585|wdt:P580 ?date .
  FILTER(?sl > 12)
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> . }
  ${LABELS}
} ORDER BY DESC(?sl) LIMIT 40`;
    const rows = await sparql(q, 25_000);
    const seen = new Set<string>();
    const out: TimelineEvent[] = [];
    for (const r of rows) {
      const id = qidOf(r.item.value);
      if (seen.has(id)) continue;
      const label = r.itemLabel?.value;
      if (!label || /^Q\d+$/.test(label)) continue;
      const d = new Date(r.date.value);
      const year = d.getUTCFullYear();
      if (!Number.isFinite(year)) continue;
      seen.add(id);
      out.push({
        id,
        label,
        date: r.date.value,
        year,
        type: r.typeLabel?.value ?? null,
        url: r.article?.value ?? `https://www.wikidata.org/wiki/${id}`,
      });
    }
    return out
      .slice(0, 20)
      .sort((a, b) => a.year - b.year);
  });
}

/** IDH mais recente de todos os países (choropleth) — P1081 com ponto no tempo. */
export function getHdiForAll(): Promise<Record<string, { value: number; year: number | null }>> {
  return cached("wd:hdi:all", TTL.CHOROPLETH, async () => {
    const q = `
SELECT ?iso3 ?hdi ?date WHERE {
  ?country wdt:P298 ?iso3 ; p:P1081 ?s .
  ?s ps:P1081 ?hdi .
  OPTIONAL { ?s pq:P585 ?date . }
  FILTER NOT EXISTS { ?country wdt:P576 ?dissolved . }
}`;
    const rows = await sparql(q, 25_000);
    const out: Record<string, { value: number; year: number | null }> = {};
    for (const r of rows) {
      const iso = r.iso3.value;
      const v = Number(r.hdi.value);
      const y = r.date ? new Date(r.date.value).getUTCFullYear() : null;
      if (!Number.isFinite(v)) continue;
      const cur = out[iso];
      if (!cur || (y ?? 0) > (cur.year ?? 0)) out[iso] = { value: v, year: y };
    }
    // Kosovo: Wikidata usa XKX como P298
    if (out.XKX && !out.UNK) out.UNK = out.XKX;
    return out;
  });
}
