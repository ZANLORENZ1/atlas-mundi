"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useAtlasStore } from "@/store/useAtlasStore";
import { useFetch } from "@/lib/useFetch";
import { buildMapFeatures, loadTopology, type MapFeature } from "@/lib/geo";
import { buildColorScale, COLOR_MODE_LABEL } from "@/lib/colors";
import type { ChoroplethResponse, ColorMode, CountrySummary } from "@/types";
import WorldMap2D from "@/components/map/WorldMap2D";
import MapLegend from "@/components/map/MapLegend";
import SearchBox from "@/components/SearchBox";
import HeadlineTicker from "@/components/HeadlineTicker";
import CountryPanel from "@/components/panel/CountryPanel";
import CompareDialog from "@/components/CompareDialog";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import { IconCompare, IconGlobe, IconMap, IconMoon, IconReset, IconShuffle, IconStar, IconSun } from "@/components/ui/Icons";

const Globe3D = dynamic(() => import("@/components/map/Globe3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">Carregando globo…</div>
  ),
});

const MODES: ColorMode[] = ["continent", "population", "gdp", "hdi", "life"];

const noopSubscribe = () => () => {};

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => true, // servidor: assume desktop
  );
}

export default function AtlasApp({ initialCode }: { initialCode?: string }) {
  const selected = useAtlasStore((s) => s.selected);
  const select = useAtlasStore((s) => s.select);
  const hovered = useAtlasStore((s) => s.hovered);
  const setHovered = useAtlasStore((s) => s.setHovered);
  const view = useAtlasStore((s) => s.view);
  const setView = useAtlasStore((s) => s.setView);
  const colorMode = useAtlasStore((s) => s.colorMode);
  const setColorMode = useAtlasStore((s) => s.setColorMode);
  const theme = useAtlasStore((s) => s.theme);
  const toggleTheme = useAtlasStore((s) => s.toggleTheme);
  const favorites = useAtlasStore((s) => s.favorites);
  const setFavoritesOpen = useAtlasStore((s) => s.setFavoritesOpen);
  const setCompareOpen = useAtlasStore((s) => s.setCompareOpen);

  const isMobile = !useMedia("(min-width: 768px)");
  const { data: countries } = useFetch<CountrySummary[]>("/api/countries");
  const { data: choropleth } = useFetch<ChoroplethResponse>(colorMode === "continent" || colorMode === "population" ? null : "/api/choropleth");
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [tooltip, setTooltip] = useState<{ f: MapFeature; x: number; y: number } | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  // true só no cliente (evita divergência de hidratação com o localStorage)
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const initialApplied = useRef(false);

  // Preferências salvas (favoritos, tema, modo) entram depois da hidratação
  useEffect(() => {
    void useAtlasStore.persist.rehydrate();
  }, []);

  // Tema no <html>
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Feições do mapa
  useEffect(() => {
    if (!countries) return;
    let alive = true;
    loadTopology()
      .then((topo) => alive && setFeatures(buildMapFeatures(topo, countries)))
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, [countries]);

  const byCca3 = useMemo(() => new Map((countries ?? []).map((c) => [c.cca3, c])), [countries]);
  const byCca2 = useMemo(() => new Map((countries ?? []).map((c) => [c.cca2, c])), [countries]);

  // URL inicial /pais/XX (lida no cliente para manter a página estática)
  useEffect(() => {
    if (initialApplied.current || !countries) return;
    initialApplied.current = true;
    const fromPath = /^\/pais\/([A-Za-z]{2,3})/.exec(window.location.pathname)?.[1];
    const code = (initialCode ?? fromPath ?? "").toUpperCase();
    if (!code) return;
    const c = byCca2.get(code) ?? byCca3.get(code);
    if (c) select(c.cca3, "dados");
  }, [initialCode, countries, byCca2, byCca3, select]);

  // Mantém a URL sincronizada (compartilhável) sem navegar
  useEffect(() => {
    if (!hydrated || !countries || !initialApplied.current) return;
    const c = selected ? byCca3.get(selected) : null;
    const target = c ? `/pais/${c.cca2}` : "/";
    if (window.location.pathname !== target) window.history.replaceState(null, "", target);
    document.title = c ? `${c.name} · Atlas Mundi` : "Atlas Mundi";
  }, [selected, byCca3, hydrated, countries]);

  const scale = useMemo(() => buildColorScale(colorMode, choropleth), [colorMode, choropleth]);
  const colorFor = useCallback((f: MapFeature) => scale.colorFor(f.cca3, f.country), [scale]);

  const onSelectFeature = useCallback(
    (f: MapFeature) => {
      if (f.cca3) select(f.cca3);
      else select(null);
      setTooltip(null);
    },
    [select],
  );
  const onSelectCountry = useCallback((c: CountrySummary) => select(c.cca3), [select]);
  const onHover2D = useCallback(
    (f: MapFeature | null, pos: { x: number; y: number } | null) => {
      setHovered(f?.cca3 ?? null);
      setTooltip(f && pos ? { f, x: pos.x, y: pos.y } : null);
    },
    [setHovered],
  );
  const onHover3D = useCallback((f: MapFeature | null) => setHovered(f?.cca3 ?? null), [setHovered]);

  const random = () => {
    const pool = features.filter((f) => f.cca3);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    select(pick.cca3);
  };

  const close = useCallback(() => {
    select(null);
    setResetSignal((n) => n + 1);
  }, [select]);

  const ready = features.length > 0;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      {/* Fundo */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, var(--ocean-2) 0%, var(--ocean-1) 55%, var(--bg) 100%)" }} />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(var(--fg) 0.6px, transparent 0.6px)", backgroundSize: "22px 22px" }} />
      </div>

      {/* Mapa / Globo */}
      <div className="absolute inset-0">
        {!ready ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="display text-4xl text-fg">Atlas Mundi</div>
              <div className="mt-2 text-sm text-muted">Carregando o mundo…</div>
            </div>
          </div>
        ) : view === "2d" ? (
          <WorldMap2D features={features} colorFor={colorFor} selected={selected} onSelect={onSelectFeature} onHover={onHover2D} resetSignal={resetSignal} />
        ) : (
          <Globe3D features={features} colorFor={colorFor} selected={selected} hovered={hovered} theme={theme} onSelect={onSelectFeature} onHover={onHover3D} />
        )}
      </div>

      {/* Tooltip 2D */}
      <AnimatePresence>
        {tooltip && view === "2d" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="glass pointer-events-none fixed z-30 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm shadow-xl"
            style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
            role="tooltip"
          >
            {tooltip.f.country ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tooltip.f.country.flagSvg} alt="" className="h-4 w-6 rounded-sm object-cover" />
                <span className="text-fg">{tooltip.f.name}</span>
              </>
            ) : (
              <span className="text-muted">
                {tooltip.f.name} <span className="text-faint">· dados indisponíveis</span>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cabeçalho */}
      <header
        className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-3 p-4 transition-[padding] duration-300 md:p-5 ${
          selected && !isMobile ? "md:pr-[476px]" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto">
            <h1 className="display text-2xl leading-none text-fg md:text-[28px]">
              Atlas <span className="italic text-accent">Mundi</span>
            </h1>
            <p className="mt-1 hidden text-[11px] uppercase tracking-[0.22em] text-faint sm:block">Geopolítica · História · Economia</p>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <div className="glass flex rounded-full p-0.5" role="group" aria-label="Modo de visualização">
              <button type="button" onClick={() => setView("2d")} aria-pressed={view === "2d"} aria-label="Mapa 2D" className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${view === "2d" ? "bg-accent text-white" : "text-muted hover:text-fg"}`}>
                <IconMap width={15} height={15} /> <span className="hidden sm:inline">Mapa</span>
              </button>
              <button type="button" onClick={() => setView("3d")} aria-pressed={view === "3d"} aria-label="Globo 3D" className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${view === "3d" ? "bg-accent text-white" : "text-muted hover:text-fg"}`}>
                <IconGlobe width={15} height={15} /> <span className="hidden sm:inline">Globo</span>
              </button>
            </div>
            <button type="button" onClick={random} aria-label="País aleatório" title="País aleatório" className="glass focus-ring rounded-full p-2 text-muted hover:text-fg">
              <IconShuffle />
            </button>
            <button type="button" onClick={() => setFavoritesOpen(true)} aria-label="Favoritos" title="Favoritos" className="glass focus-ring relative rounded-full p-2 text-muted hover:text-fg">
              <IconStar filled={favorites.length > 0} className={favorites.length ? "text-accent" : ""} />
              {hydrated && favorites.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white">{favorites.length}</span>
              )}
            </button>
            <button type="button" onClick={() => setCompareOpen(true)} aria-label="Comparar países" title="Comparar países" className="glass focus-ring hidden rounded-full p-2 text-muted hover:text-fg sm:block">
              <IconCompare />
            </button>
            <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} className="glass focus-ring rounded-full p-2 text-muted hover:text-fg">
              {hydrated && theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </div>
        <div className="pointer-events-auto mx-auto w-full max-w-xl">
          {countries && <SearchBox countries={countries} onPick={onSelectCountry} />}
        </div>
      </header>

      {/* Controles inferiores esquerdos: coloração + legenda */}
      <div className={`pointer-events-none absolute bottom-20 left-4 z-30 flex flex-col items-start gap-2 md:bottom-24 md:left-5 ${selected && isMobile ? "hidden" : ""}`}>
        <div className="pointer-events-auto glass flex max-w-[calc(100vw-2rem)] gap-0.5 overflow-x-auto rounded-full p-0.5" role="group" aria-label="Modo de coloração">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setColorMode(m)}
              aria-pressed={colorMode === m}
              className={`focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${colorMode === m ? "bg-accent text-white" : "text-muted hover:text-fg"}`}
            >
              {COLOR_MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="pointer-events-auto hidden sm:block">
          <MapLegend legend={scale.legend} />
        </div>
        {view === "2d" && (
          <button type="button" onClick={() => setResetSignal((n) => n + 1)} className="pointer-events-auto glass focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted hover:text-fg" aria-label="Resetar o zoom">
            <IconReset width={14} height={14} /> Resetar vista
          </button>
        )}
      </div>

      {/* Faixa de manchetes */}
      <div className={`pointer-events-none absolute inset-x-4 bottom-4 z-20 md:inset-x-5 ${selected ? "md:right-[476px]" : ""} ${selected && isMobile ? "hidden" : ""}`}>
        <HeadlineTicker />
      </div>

      {/* Rodapé: assinatura + atribuição das fontes */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0.5 z-10 flex items-center justify-between gap-4 px-4 text-[9px] text-faint md:px-5">
        <p className="pointer-events-auto tracking-[0.18em] opacity-70 transition-opacity hover:opacity-100">
          by <span className="font-semibold text-muted">DATAZEN</span>
          <span aria-hidden> · </span>
          <a
            href="https://www.instagram.com/datazen____/"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring tracking-normal hover:text-accent"
            aria-label="Instagram da DATAZEN: @datazen____"
          >
            @datazen____
          </a>
        </p>
        <p className="hidden md:block">Dados: Banco Mundial · Wikidata · Wikipédia · world-countries · Google Notícias</p>
      </footer>

      {/* Painel */}
      {countries && <CountryPanel cca3={selected} byCca3={byCca3} onSelect={onSelectCountry} onClose={close} isMobile={isMobile} />}
      {countries && <CompareDialog countries={countries} byCca3={byCca3} />}
      {countries && <FavoritesDrawer byCca3={byCca3} onSelect={onSelectCountry} />}
    </div>
  );
}
