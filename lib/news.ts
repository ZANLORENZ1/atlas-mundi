import { cached, TTL } from "@/lib/cache";
import { classifyNews, normalizeText } from "@/lib/classifyNews";
import { NEWS_ALIASES, normalize } from "@/lib/isoMap";
import { fetchFeed, type RawFeedItem } from "@/lib/rss";
import { NEWS_SOURCES, WORLD_FEEDS, googleNewsSearchUrl, type NewsSource } from "@/config/news-sources";
import type { NewsItem, NewsLanguage, NewsResponse, NewsSourceStatus } from "@/types";

const MAX_ITEMS = 180;
const MAX_AGE_DAYS = 14;

function domainOf(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function toItem(raw: RawFeedItem, src: { id: string; name: string; domain: string; language: NewsLanguage; defaultCategory?: NewsItem["category"] }): NewsItem | null {
  if (!raw.publishedAt) return null;
  const age = Date.now() - new Date(raw.publishedAt).getTime();
  if (age > MAX_AGE_DAYS * 86_400_000 || age < -3_600_000) return null;
  const isGoogle = src.id.startsWith("gn-");
  const source = isGoogle && raw.sourceName ? raw.sourceName : src.name;
  const domain = isGoogle ? domainOf(raw.sourceUrl, "news.google.com") : src.domain;
  return {
    id: hashId(raw.link),
    title: raw.title,
    link: raw.link,
    source,
    sourceId: isGoogle ? `gn:${normalize(source)}` : src.id,
    sourceDomain: domain,
    publishedAt: raw.publishedAt,
    language: src.language,
    category: classifyNews(raw.title, raw.categories, src.defaultCategory),
  };
}

/** Chave de deduplicação por título (sem acento/pontuação, primeiras palavras). */
function titleKey(title: string): string {
  return normalizeText(title.replace(/\s[-–|]\s[^-–|]+$/, "")) // remove " - Veículo" no fim
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 9)
    .join(" ");
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function dedupe(items: NewsItem[]): NewsItem[] {
  const byLink = new Set<string>();
  const keys = new Set<string>();
  const wordSets: Array<Set<string>> = [];
  const out: NewsItem[] = [];
  for (const it of items) {
    const link = it.link.split("?")[0];
    if (byLink.has(link)) continue;
    const key = titleKey(it.title);
    if (keys.has(key)) continue;
    const words = new Set(key.split(" "));
    if (words.size >= 4 && wordSets.some((w) => jaccard(w, words) >= 0.75)) continue;
    byLink.add(link);
    keys.add(key);
    wordSets.push(words);
    out.push(it);
  }
  return out;
}

function sortDesc(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/** Feed direto, compartilhado entre países (cache de 30 min por URL). */
function getDirectFeed(src: NewsSource, refresh = false): Promise<RawFeedItem[]> {
  return cached(`feed:${src.id}`, TTL.NEWS, () => fetchFeed(src.url), { refresh });
}

function buildMatcher(names: string[]): (title: string) => boolean {
  const terms = Array.from(new Set(names.map((n) => normalize(n)).filter((n) => n.length >= 3)));
  const res = terms.map((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i"));
  return (title: string) => {
    const t = normalize(title);
    return res.some((re) => re.test(t));
  };
}

export interface CountryNewsInput {
  cca2: string;
  namePt: string;
  nameEn: string;
  demonyms?: string[];
}

export function getCountryNews(input: CountryNewsInput, refresh = false): Promise<NewsResponse> {
  const code = input.cca2.toUpperCase();
  return cached(
    `news:${code}`,
    TTL.NEWS,
    async () => {
      const names = [input.namePt, input.nameEn, ...(NEWS_ALIASES[code] ?? []), ...(input.demonyms ?? [])];
      const matches = buildMatcher(names);
      const statuses: NewsSourceStatus[] = [];
      const all: NewsItem[] = [];

      const googleTasks = [
        { id: "gn-pt", name: "Google News (PT)", url: googleNewsSearchUrl(input.namePt, "pt"), language: "pt" as const },
        { id: "gn-en", name: "Google News (EN)", url: googleNewsSearchUrl(input.nameEn, "en"), language: "en" as const },
      ].map(async (g) => {
        try {
          const raw = await fetchFeed(g.url);
          const items = raw
            .map((r) => toItem(r, { id: g.id, name: g.name, domain: "news.google.com", language: g.language }))
            .filter((x): x is NewsItem => !!x);
          all.push(...items);
          statuses.push({ id: g.id, name: g.name, ok: true, count: items.length });
        } catch (err) {
          statuses.push({ id: g.id, name: g.name, ok: false, count: 0, error: err instanceof Error ? err.message : String(err) });
        }
      });

      const directTasks = NEWS_SOURCES.map(async (src) => {
        try {
          const raw = await getDirectFeed(src, refresh);
          const items = raw
            .filter((r) => matches(r.title))
            .map((r) => toItem(r, src))
            .filter((x): x is NewsItem => !!x);
          all.push(...items);
          statuses.push({ id: src.id, name: src.name, ok: true, count: items.length });
        } catch (err) {
          statuses.push({ id: src.id, name: src.name, ok: false, count: 0, error: err instanceof Error ? err.message : String(err) });
        }
      });

      await Promise.all([...googleTasks, ...directTasks]);
      const items = dedupe(sortDesc(all)).slice(0, MAX_ITEMS);
      return { items, sources: statuses, fetchedAt: new Date().toISOString() };
    },
    { refresh },
  );
}

/** Manchetes gerais para a faixa da tela inicial. */
export function getWorldNews(refresh = false): Promise<NewsResponse> {
  return cached(
    "news:world",
    TTL.NEWS,
    async () => {
      const statuses: NewsSourceStatus[] = [];
      const all: NewsItem[] = [];
      await Promise.all(
        WORLD_FEEDS.map(async (f) => {
          try {
            const raw = await fetchFeed(f.url);
            const items = raw
              .map((r) => toItem(r, { id: f.id, name: f.name, domain: "news.google.com", language: f.language }))
              .filter((x): x is NewsItem => !!x);
            all.push(...items);
            statuses.push({ id: f.id, name: f.name, ok: true, count: items.length });
          } catch (err) {
            statuses.push({ id: f.id, name: f.name, ok: false, count: 0, error: err instanceof Error ? err.message : String(err) });
          }
        }),
      );
      const items = dedupe(sortDesc(all)).slice(0, 60);
      return { items, sources: statuses, fetchedAt: new Date().toISOString() };
    },
    { refresh },
  );
}
