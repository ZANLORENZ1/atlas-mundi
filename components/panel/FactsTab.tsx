"use client";

import { motion } from "framer-motion";
import { useFetch } from "@/lib/useFetch";
import { formatYearLabel } from "@/lib/format";
import type { CountryDetail, FactCard, FactsResponse } from "@/types";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { IconExternal } from "@/components/ui/Icons";

function CardGrid({ title, items, emoji }: { title: string; items: FactCard[]; emoji: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        <span aria-hidden>{emoji}</span> {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it, i) => (
          <motion.a
            key={it.id}
            href={it.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="focus-ring group overflow-hidden rounded-2xl border border-line bg-elev-2/60 transition-colors hover:border-accent"
          >
            {it.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="" loading="lazy" className="h-24 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="h-24 w-full bg-gradient-to-br from-accent-soft to-transparent" />
            )}
            <div className="px-3 py-2">
              <div className="line-clamp-2 text-sm font-medium leading-snug text-fg">{it.label}</div>
              {(it.description || it.year) && (
                <div className="mt-0.5 line-clamp-2 text-[11px] text-faint">
                  {it.year ? `${it.year} · ` : ""}
                  {it.description}
                </div>
              )}
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}

function PillList({ title, items, emoji }: { title: string; items: FactCard[]; emoji: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        <span aria-hidden>{emoji}</span> {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={it.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-line bg-elev-2/60 py-1 pl-1 pr-3 text-xs text-fg hover:border-accent"
            >
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="inline-block h-6 w-6 rounded-full bg-accent-soft" />
              )}
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function FactsTab({ country }: { country: CountryDetail }) {
  const { data, loading } = useFetch<FactsResponse>(`/api/country/${country.cca2}/facts`);

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40" />
        <SkeletonLines n={6} />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  const s = data?.summary ?? null;
  const hasAnything =
    s || data?.unesco.length || data?.dishes.length || data?.sports.length || data?.people.length || data?.events.length;

  if (!hasAnything) {
    return <p className="text-sm text-muted">Sem curiosidades disponíveis para este território no momento.</p>;
  }

  return (
    <div className="space-y-7">
      {s && (
        <section aria-label="Resumo" className="overflow-hidden rounded-2xl border border-line bg-elev-2/60">
          {s.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.image} alt={`Imagem de ${country.name}`} className="max-h-56 w-full object-cover" />
          )}
          <div className="p-4">
            <p className="text-[15px] leading-relaxed text-fg/90" style={{ fontFamily: "var(--font-serif)" }}>
              {s.extract}
            </p>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              Ler na Wikipédia{s.lang === "en" ? " (em inglês)" : ""} <IconExternal width={13} height={13} />
            </a>
          </div>
        </section>
      )}

      <CardGrid title="Comidas típicas" emoji="🍽️" items={data?.dishes ?? []} />
      <CardGrid title="Patrimônios da UNESCO" emoji="🏛️" items={data?.unesco ?? []} />
      <PillList title="Esportes" emoji="⚽" items={data?.sports ?? []} />
      <PillList title="Personalidades" emoji="🌟" items={data?.people ?? []} />

      {!!data?.events.length && (
        <section aria-label="Linha do tempo">
          <h3 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            <span aria-hidden>🕰️</span> Linha do tempo
          </h3>
          <ol className="relative ml-2 border-l border-line-strong pl-5">
            {data.events.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="relative mb-4 last:mb-0"
              >
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-elev bg-accent" aria-hidden />
                <div className="display text-sm font-medium text-accent">{formatYearLabel(e.year)}</div>
                <a href={e.url ?? undefined} target="_blank" rel="noopener noreferrer" className="focus-ring text-sm text-fg hover:underline">
                  {e.label}
                </a>
                {e.type && <div className="text-[11px] text-faint">{e.type}</div>}
              </motion.li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-[11px] text-faint">
        Fontes: Wikipédia (resumo e imagem) e Wikidata (patrimônios, pratos, esportes, personalidades e eventos). Conteúdo sob licença CC BY-SA.
      </p>
    </div>
  );
}
