"use client";

import { useMemo } from "react";
import { useFetch } from "@/lib/useFetch";
import { CATEGORIES, CATEGORY_BY_ID } from "@/lib/classifyNews";
import { timeAgo } from "@/lib/format";
import type { NewsResponse } from "@/types";
import { IconExternal } from "@/components/ui/Icons";

export default function HeadlineTicker() {
  const { data, loading } = useFetch<NewsResponse>("/api/news/world");

  // Agrupa por categoria (na ordem das categorias) e intercala
  const items = useMemo(() => {
    if (!data?.items.length) return [];
    const byCat = new Map(CATEGORIES.map((c) => [c.id, [] as NewsResponse["items"]]));
    for (const it of data.items) byCat.get(it.category)?.push(it);
    const out: NewsResponse["items"] = [];
    for (const c of CATEGORIES) out.push(...(byCat.get(c.id) ?? []).slice(0, 5));
    return out.slice(0, 40);
  }, [data]);

  if (!loading && items.length === 0) return null;

  const duration = Math.max(60, items.length * 6);

  return (
    <div
      className="ticker glass pointer-events-auto relative flex h-11 items-center overflow-hidden rounded-full shadow-lg"
      aria-label="Manchetes do mundo"
    >
      <div className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-line bg-elev/80 pl-4 pr-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        Manchetes do mundo
      </div>
      <div className="relative h-full flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center gap-6 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-3 w-48" />
            ))}
          </div>
        ) : (
          <div className="ticker-track flex h-full w-max items-center" style={{ ["--ticker-duration" as string]: `${duration}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex h-full items-center" aria-hidden={copy === 1}>
                {items.map((it) => {
                  const meta = CATEGORY_BY_ID[it.category];
                  return (
                    <a
                      key={`${copy}-${it.id}`}
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={copy === 1 ? -1 : 0}
                      className="focus-ring group mx-3 flex items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-sm text-fg transition-colors hover:text-accent"
                    >
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: `color-mix(in srgb, ${meta.color} 18%, transparent)`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="max-w-[520px] truncate">{it.title}</span>
                      <span className="text-xs text-faint">
                        {it.source} · {timeAgo(it.publishedAt)}
                      </span>
                      <IconExternal width={13} height={13} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
