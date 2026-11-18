"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFetch } from "@/lib/useFetch";
import { CATEGORIES } from "@/lib/classifyNews";
import { faviconUrl, timeAgo } from "@/lib/format";
import type { CountryDetail, NewsCategory, NewsItem, NewsLanguage, NewsResponse } from "@/types";
import Chip from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconExternal, IconRefresh, IconWarning } from "@/components/ui/Icons";

const PER_CATEGORY = 6;

function Headline({ item }: { item: NewsItem }) {
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-elev-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faviconUrl(item.sourceDomain)} alt="" width={16} height={16} className="mt-1 h-4 w-4 shrink-0 rounded-sm" loading="lazy" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] leading-snug text-fg group-hover:text-accent">{item.title}</span>
          <span className="mt-0.5 block text-[11px] text-faint">
            {item.source} · {timeAgo(item.publishedAt)}
            {item.language !== "pt" && <span className="ml-1 rounded border border-line px-1 text-[9px] uppercase">{item.language}</span>}
          </span>
        </span>
        <IconExternal width={14} height={14} className="mt-1 shrink-0 text-faint opacity-60 group-hover:opacity-100" />
      </a>
    </motion.li>
  );
}

export default function NewsTab({ country }: { country: CountryDetail }) {
  const { data, loading, error, reload } = useFetch<NewsResponse>(`/api/country/${country.cca2}/news`);
  const [category, setCategory] = useState<NewsCategory | null>(null);
  const [lang, setLang] = useState<NewsLanguage | "all">("all");
  const [sourceId, setSourceId] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<NewsCategory>>(new Set());

  const sources = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of data?.items ?? []) m.set(it.sourceId, it.source);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt"));
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.items ?? []).filter((it) => (lang === "all" || it.language === lang) && (sourceId === "all" || it.sourceId === sourceId));
  }, [data, lang, sourceId]);

  const counts = useMemo(() => {
    const c = new Map<NewsCategory, number>();
    for (const it of filtered) c.set(it.category, (c.get(it.category) ?? 0) + 1);
    return c;
  }, [filtered]);

  const groups = useMemo(() => {
    const g = new Map<NewsCategory, NewsItem[]>();
    for (const it of filtered) {
      if (category && it.category !== category) continue;
      if (!g.has(it.category)) g.set(it.category, []);
      g.get(it.category)!.push(it);
    }
    return CATEGORIES.filter((c) => g.has(c.id)).map((c) => ({ meta: c, items: g.get(c.id)! }));
  }, [filtered, category]);

  const failed = (data?.sources ?? []).filter((s) => !s.ok);
  const okCount = (data?.sources ?? []).filter((s) => s.ok).length;

  const toggleExpand = (id: NewsCategory) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-4">
      {/* Cabeçalho + atualizar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {data ? `${filtered.length} manchetes · ${okCount} fontes` : "Carregando manchetes…"}
          {data?.fetchedAt && <span className="text-faint"> · atualizado {timeAgo(data.fetchedAt)}</span>}
        </p>
        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-fg hover:border-accent disabled:opacity-50"
          aria-label="Atualizar manchetes"
        >
          <IconRefresh width={14} height={14} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* Categorias */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
        <Chip label="Todas" color="var(--fg-muted)" count={filtered.length} active={category === null} onClick={() => setCategory(null)} small />
        {CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0).map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            color={c.color}
            count={counts.get(c.id) ?? 0}
            active={category === c.id}
            onClick={() => setCategory(category === c.id ? null : c.id)}
            small
          />
        ))}
      </div>

      {/* Filtros de idioma e veículo */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex overflow-hidden rounded-full border border-line" role="group" aria-label="Idioma">
          {(["all", "pt", "en", "other"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`px-2.5 py-1 transition-colors ${lang === l ? "bg-accent text-white" : "text-muted hover:text-fg"}`}
            >
              {l === "all" ? "Todos" : l === "pt" ? "PT" : l === "en" ? "EN" : "Outros"}
            </button>
          ))}
        </div>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          aria-label="Filtrar por veículo"
          className="focus-ring max-w-[180px] rounded-full border border-line bg-elev px-3 py-1 text-xs text-fg"
        >
          <option value="all">Todos os veículos</option>
          {sources.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Avisos */}
      {failed.length > 0 && data && data.items.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-elev-2/60 px-3 py-2 text-[11px] text-muted">
          <IconWarning width={14} height={14} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            {failed.length} {failed.length === 1 ? "fonte não respondeu" : "fontes não responderam"} ({failed.map((f) => f.name).slice(0, 4).join(", ")}
            {failed.length > 4 ? "…" : ""}). Mostrando as demais.
          </span>
        </p>
      )}

      {/* Lista */}
      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : error && !data ? (
        <p className="text-sm text-muted">Não foi possível carregar as manchetes.</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma manchete recente encontrada com esses filtros.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(({ meta, items }) => {
            const open = expanded.has(meta.id) || category === meta.id;
            const shown = open ? items : items.slice(0, PER_CATEGORY);
            return (
              <section key={meta.id} aria-label={meta.label}>
                <h3 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden />
                  {meta.label} <span className="text-faint">· {items.length}</span>
                </h3>
                <ul className="-mx-2">
                  <AnimatePresence initial={false}>
                    {shown.map((it) => (
                      <Headline key={it.id} item={it} />
                    ))}
                  </AnimatePresence>
                </ul>
                {items.length > PER_CATEGORY && category !== meta.id && (
                  <button type="button" onClick={() => toggleExpand(meta.id)} className="focus-ring mt-1 text-xs font-medium text-accent hover:underline">
                    {open ? "ver menos" : `ver mais (${items.length - PER_CATEGORY})`}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-faint">
        Manchetes via RSS do Google Notícias e dos veículos. Apenas título, veículo, data e link; o conteúdo abre no site original. Classificação automática por palavras-chave.
      </p>
    </div>
  );
}
