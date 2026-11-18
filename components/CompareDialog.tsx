"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtlasStore } from "@/store/useAtlasStore";
import { useFetch } from "@/lib/useFetch";
import { formatArea, formatCompact, formatNumber, formatPercent, formatUsd } from "@/lib/format";
import type { CountrySummary, IndicatorKey, IndicatorsResponse } from "@/types";
import SearchBox from "@/components/SearchBox";
import { IconClose } from "@/components/ui/Icons";

interface Props {
  countries: CountrySummary[];
  byCca3: Map<string, CountrySummary>;
}

const ROWS: Array<{ key: IndicatorKey; label: string; fmt: (v: number) => string; better: "high" | "low" | null }> = [
  { key: "population", label: "População", fmt: (v) => formatCompact(v, 1), better: null },
  { key: "area", label: "Área", fmt: (v) => formatArea(v), better: null },
  { key: "density", label: "Densidade", fmt: (v) => `${formatNumber(v, 0)} hab/km²`, better: null },
  { key: "gdp", label: "PIB", fmt: (v) => formatUsd(v, 1), better: "high" },
  { key: "gdpPerCapita", label: "PIB per capita", fmt: (v) => `US$ ${formatNumber(v, 0)}`, better: "high" },
  { key: "gdpGrowth", label: "Crescimento do PIB", fmt: (v) => formatPercent(v, 1), better: "high" },
  { key: "inflation", label: "Inflação", fmt: (v) => formatPercent(v, 1), better: "low" },
  { key: "unemployment", label: "Desemprego", fmt: (v) => formatPercent(v, 1), better: "low" },
  { key: "lifeExpectancy", label: "Expectativa de vida", fmt: (v) => `${formatNumber(v, 1)} anos`, better: "high" },
  { key: "hdi", label: "IDH", fmt: (v) => formatNumber(v, 3), better: "high" },
  { key: "gini", label: "Gini", fmt: (v) => formatNumber(v, 1), better: "low" },
];

function Slot({ slot, country, countries, onPick, onClear }: { slot: 0 | 1; country: CountrySummary | null; countries: CountrySummary[]; onPick: (c: CountrySummary) => void; onClear: () => void }) {
  if (!country) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong p-4 text-center">
        <p className="text-xs text-muted">{slot === 0 ? "Primeiro país" : "Segundo país"}</p>
        <SearchBox countries={countries} onPick={onPick} compact placeholder="Escolher país…" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-elev-2/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={country.flagSvg} alt="" className="h-9 w-14 rounded-md object-cover shadow" />
      <div className="min-w-0 flex-1">
        <div className="display truncate text-lg text-fg">{country.name}</div>
        <div className="truncate text-xs text-faint">{country.region}</div>
      </div>
      <button type="button" onClick={onClear} aria-label="Remover" className="focus-ring rounded-full p-1.5 text-muted hover:bg-accent-soft">
        <IconClose width={16} height={16} />
      </button>
    </div>
  );
}

export default function CompareDialog({ countries, byCca3 }: Props) {
  const open = useAtlasStore((s) => s.compareOpen);
  const setOpen = useAtlasStore((s) => s.setCompareOpen);
  const compare = useAtlasStore((s) => s.compare);
  const setCompare = useAtlasStore((s) => s.setCompare);
  const a = compare[0] ? (byCca3.get(compare[0]) ?? null) : null;
  const b = compare[1] ? (byCca3.get(compare[1]) ?? null) : null;
  const { data: da } = useFetch<IndicatorsResponse>(a ? `/api/country/${a.cca3}/indicators` : null);
  const { data: db } = useFetch<IndicatorsResponse>(b ? `/api/country/${b.cca3}/indicators` : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          style={{ background: "var(--scrim)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Comparar países"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="glass scroll-thin max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
            style={{ boxShadow: "var(--shadow)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display text-2xl text-fg">Comparar países</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="focus-ring rounded-full p-2 text-muted hover:bg-accent-soft">
                <IconClose />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Slot slot={0} country={a} countries={countries} onPick={(c) => setCompare(0, c.cca3)} onClear={() => setCompare(0, null)} />
              <Slot slot={1} country={b} countries={countries} onPick={(c) => setCompare(1, c.cca3)} onClear={() => setCompare(1, null)} />
            </div>
            {a && b && (
              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-faint">
                    <th className="pb-2 text-left font-semibold">Indicador</th>
                    <th className="pb-2 text-right font-semibold">{a.name}</th>
                    <th className="pb-2 text-right font-semibold">{b.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => {
                    let va = da?.indicators[r.key]?.value ?? null;
                    let vb = db?.indicators[r.key]?.value ?? null;
                    if (r.key === "population") {
                      va = va ?? (a.population || null);
                      vb = vb ?? (b.population || null);
                    }
                    if (r.key === "area") {
                      va = va ?? (a.area || null);
                      vb = vb ?? (b.area || null);
                    }
                    const winA = r.better && va !== null && vb !== null ? (r.better === "high" ? va > vb : va < vb) : false;
                    const winB = r.better && va !== null && vb !== null ? (r.better === "high" ? vb > va : vb < va) : false;
                    return (
                      <tr key={r.key} className="border-t border-line">
                        <td className="py-2 text-muted">{r.label}</td>
                        <td className={`py-2 text-right tabular-nums ${winA ? "font-semibold text-accent" : "text-fg"}`}>{va === null ? "—" : r.fmt(va)}</td>
                        <td className={`py-2 text-right tabular-nums ${winB ? "font-semibold text-accent" : "text-fg"}`}>{vb === null ? "—" : r.fmt(vb)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {a && b && (da?.error || db?.error) && (
              <p className="mt-3 rounded-xl border border-line bg-elev-2/60 px-3 py-2 text-xs text-muted">
                O Banco Mundial não respondeu a tempo para {[da?.error ? a.name : null, db?.error ? b.name : null].filter(Boolean).join(" e ")}. Tente
                reabrir a comparação em instantes.
              </p>
            )}
            <p className="mt-4 text-[11px] text-faint">Em destaque: o valor mais favorável em cada linha. Fontes: Banco Mundial e PNUD via Wikidata.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
