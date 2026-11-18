import { z } from "zod";
import { cached, TTL } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import type { WikiSummary } from "@/types";

const SummarySchema = z.object({
  title: z.string(),
  extract: z.string().optional(),
  thumbnail: z.object({ source: z.string() }).optional(),
  originalimage: z.object({ source: z.string() }).optional(),
  content_urls: z.object({ desktop: z.object({ page: z.string() }) }).optional(),
  type: z.string().optional(),
});

async function summary(lang: "pt" | "en", title: string): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  const data = await fetchJson(url, SummarySchema, { timeoutMs: 10_000 });
  if (data.type === "disambiguation" || !data.extract) return null;
  return {
    title: data.title,
    extract: data.extract,
    image: data.originalimage?.source ?? data.thumbnail?.source ?? null,
    url: data.content_urls?.desktop.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    lang,
  };
}

/** Resumo da Wikipédia em pt-BR, com fallback para inglês. */
export function getWikiSummary(candidates: { pt: string[]; en: string[] }): Promise<WikiSummary | null> {
  const key = `wiki:${candidates.pt.join("|")}|${candidates.en.join("|")}`;
  return cached(key, TTL.FACTS, async () => {
    for (const t of candidates.pt.filter(Boolean)) {
      try {
        const s = await summary("pt", t);
        if (s) return s;
      } catch {
        /* tenta o próximo */
      }
    }
    for (const t of candidates.en.filter(Boolean)) {
      try {
        const s = await summary("en", t);
        if (s) return s;
      } catch {
        /* tenta o próximo */
      }
    }
    return null;
  });
}
