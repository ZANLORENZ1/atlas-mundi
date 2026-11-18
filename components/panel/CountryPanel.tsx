"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useFetch } from "@/lib/useFetch";
import { useAtlasStore, type PanelTab } from "@/store/useAtlasStore";
import type { CountryDetail, CountrySummary } from "@/types";
import DataTab from "./DataTab";
import FactsTab from "./FactsTab";
import NewsTab from "./NewsTab";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconClose, IconCompare, IconShare, IconStar } from "@/components/ui/Icons";

interface Props {
  cca3: string | null;
  byCca3: Map<string, CountrySummary>;
  onSelect: (c: CountrySummary) => void;
  onClose: () => void;
  isMobile: boolean;
}

const TABS: Array<{ id: PanelTab; label: string }> = [
  { id: "dados", label: "Dados" },
  { id: "curiosidades", label: "Curiosidades" },
  { id: "noticias", label: "Notícias" },
];

function Header({
  country,
  summary,
  onClose,
}: {
  country: CountryDetail | null;
  summary: CountrySummary | null;
  onClose: () => void;
}) {
  const favorites = useAtlasStore((s) => s.favorites);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const setCompare = useAtlasStore((s) => s.setCompare);
  const setCompareOpen = useAtlasStore((s) => s.setCompareOpen);
  const compare = useAtlasStore((s) => s.compare);
  const [copied, setCopied] = useState(false);
  const c = country ?? summary;
  if (!c) return null;
  const fav = favorites.includes(c.cca3);

  const share = async () => {
    const url = `${window.location.origin}/pais/${c.cca2}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${c.name} · Atlas Mundi`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* usuário cancelou */
    }
  };

  const addCompare = () => {
    if (compare[0] === c.cca3 || compare[1] === c.cca3) {
      setCompareOpen(true);
      return;
    }
    if (!compare[0]) setCompare(0, c.cca3);
    else setCompare(1, c.cca3);
    setCompareOpen(true);
  };

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-40 overflow-hidden rounded-t-3xl md:rounded-tl-3xl md:rounded-tr-none" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.flagSvg} alt="" className="h-full w-full scale-110 object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-elev/60 to-elev" />
      </div>
      <div className="relative flex items-start gap-3 px-4 pb-3 pt-4 md:gap-4 md:px-5 md:pt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.flagSvg}
          alt={`Bandeira: ${c.name}`}
          className="h-11 w-16 shrink-0 rounded-lg object-cover shadow-lg ring-1 ring-black/20 md:h-14 md:w-20"
        />
        <div className="min-w-0 flex-1">
          <h2 className="display line-clamp-2 text-[22px] font-medium leading-tight text-fg md:text-[26px]">{c.name}</h2>
          <p className="truncate text-xs text-muted">{country?.officialNamePt ?? ""}</p>
          <p className="mt-1 truncate text-xs text-faint">
            {country?.capital.length ? `${country.capital.join(", ")} · ` : ""}
            {c.region}
            {c.subregion ? ` · ${c.subregion}` : ""}
          </p>
        </div>
        <div className="-mr-1 flex shrink-0 items-center gap-0 md:gap-1">
          <button
            type="button"
            onClick={() => toggleFavorite(c.cca3)}
            aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            aria-pressed={fav}
            className={`focus-ring rounded-full p-2 transition-colors hover:bg-accent-soft ${fav ? "text-accent" : "text-muted"}`}
          >
            <IconStar filled={fav} />
          </button>
          <button type="button" onClick={addCompare} aria-label="Comparar país" className="focus-ring rounded-full p-2 text-muted transition-colors hover:bg-accent-soft hover:text-fg">
            <IconCompare />
          </button>
          <button type="button" onClick={share} aria-label="Compartilhar link do país" className="focus-ring relative rounded-full p-2 text-muted transition-colors hover:bg-accent-soft hover:text-fg">
            <IconShare />
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-0.5 text-[10px] text-bg"
                >
                  Link copiado
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar painel" className="focus-ring rounded-full p-2 text-muted transition-colors hover:bg-accent-soft hover:text-fg">
            <IconClose />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CountryPanel({ cca3, byCca3, onSelect, onClose, isMobile }: Props) {
  const tab = useAtlasStore((s) => s.tab);
  const setTab = useAtlasStore((s) => s.setTab);
  const summary = cca3 ? (byCca3.get(cca3) ?? null) : null;
  const { data: country, loading } = useFetch<CountryDetail>(cca3 ? `/api/country/${cca3}` : null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  // O estado "expandido" vale só para o país em que foi definido: trocar de país recolhe a sheet.
  const [sheet, setSheet] = useState<{ code: string | null; expanded: boolean }>({ code: null, expanded: false });
  const sheetExpanded = sheet.code === cca3 && sheet.expanded;
  const setSheetExpanded = (expanded: boolean) => setSheet({ code: cca3, expanded });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [cca3]);

  useEffect(() => {
    if (!cca3) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // com um diálogo aberto (comparar/favoritos), o Esc fecha só o diálogo
      const s = useAtlasStore.getState();
      if (s.compareOpen || s.favoritesOpen) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cca3, onClose]);

  const neighbors = useMemo(
    () => (country?.borders ?? []).map((b) => byCca3.get(b)).filter((c): c is CountrySummary => !!c),
    [country, byCca3],
  );

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      if (sheetExpanded) setSheetExpanded(false);
      else onClose();
    } else if (info.offset.y < -80 || info.velocity.y < -500) {
      setSheetExpanded(true);
    }
  };

  const detail = country && country.cca3 === cca3 ? country : null;

  const body = (
    <>
      <Header country={detail} summary={summary} onClose={onClose} />
      <div className="sticky top-0 z-10 border-b border-line bg-elev/90 px-5 backdrop-blur" role="tablist" aria-label="Seções do país">
        <div className="relative flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`focus-ring relative px-3 py-2.5 text-sm transition-colors ${tab === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
            >
              {t.label}
              {tab === t.id && (
                <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-10 pt-4" role="tabpanel">
        {!cca3 ? null : loading && !detail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted">Dados indisponíveis para este território.</p>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {tab === "dados" && <DataTab country={detail} neighbors={neighbors} onSelectNeighbor={onSelect} />}
              {tab === "curiosidades" && <FactsTab country={detail} />}
              {tab === "noticias" && <NewsTab country={detail} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {cca3 && summary && (
        isMobile ? (
          <motion.aside
            key="sheet"
            role="dialog"
            aria-modal="false"
            aria-label={`Painel: ${summary.name}`}
            initial={{ y: "100%" }}
            animate={{ y: sheetExpanded ? "4%" : "48%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            className="glass fixed inset-x-0 bottom-0 z-40 flex h-[100dvh] flex-col rounded-t-3xl shadow-2xl"
            style={{ boxShadow: "var(--shadow)" }}
          >
            <div
              className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              aria-label="Arraste para expandir ou fechar"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") setSheetExpanded(true);
                if (e.key === "ArrowDown") {
                  if (sheetExpanded) setSheetExpanded(false);
                  else onClose();
                }
              }}
            >
              <span className="h-1.5 w-12 rounded-full bg-line-strong" />
            </div>
            <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {body}
            </div>
          </motion.aside>
        ) : (
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="false"
            aria-label={`Painel: ${summary.name}`}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass fixed bottom-4 right-4 top-4 z-40 w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl"
            style={{ boxShadow: "var(--shadow)" }}
          >
            <div ref={scrollRef} className="scroll-thin h-full overflow-y-auto">
              {body}
            </div>
          </motion.aside>
        )
      )}
    </AnimatePresence>
  );
}
