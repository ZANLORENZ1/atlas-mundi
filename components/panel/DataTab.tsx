"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFetch } from "@/lib/useFetch";
import { flagThumb, formatArea, formatCompact, formatNumber, formatPercent, formatUsd } from "@/lib/format";
import type { CountryDetail, CountrySummary, Indicator, IndicatorKey, IndicatorsResponse } from "@/types";
import CountUp from "@/components/ui/CountUp";
import { Skeleton, SkeletonCards } from "@/components/ui/Skeleton";
import { IconChevron } from "@/components/ui/Icons";

interface Props {
  country: CountryDetail;
  neighbors: CountrySummary[];
  onSelectNeighbor: (c: CountrySummary) => void;
}

interface Spec {
  key: IndicatorKey;
  label: string;
  format: (v: number) => string;
  compare?: boolean;
  better?: "high" | "low";
}

const SPECS: Spec[] = [
  { key: "population", label: "População", format: (v) => formatCompact(v, 1) },
  { key: "area", label: "Área", format: (v) => formatArea(v) },
  { key: "density", label: "Densidade", format: (v) => `${formatNumber(v, 0)} hab/km²`, compare: true },
  { key: "gdp", label: "PIB", format: (v) => formatUsd(v, 1) },
  { key: "gdpPerCapita", label: "PIB per capita", format: (v) => `US$ ${formatNumber(v, 0)}`, compare: true, better: "high" },
  { key: "gdpGrowth", label: "Crescimento do PIB", format: (v) => formatPercent(v, 1), compare: true, better: "high" },
  { key: "inflation", label: "Inflação", format: (v) => formatPercent(v, 1), compare: true, better: "low" },
  { key: "unemployment", label: "Desemprego", format: (v) => formatPercent(v, 1), compare: true, better: "low" },
  { key: "lifeExpectancy", label: "Expectativa de vida", format: (v) => `${formatNumber(v, 1)} anos`, compare: true, better: "high" },
  { key: "hdi", label: "IDH", format: (v) => formatNumber(v, 3) },
  { key: "gini", label: "Índice de Gini", format: (v) => formatNumber(v, 1) },
];

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-elev-2/60 px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="mt-1 text-sm text-fg">{children}</div>
    </div>
  );
}

function StatCard({ spec, ind, world }: { spec: Spec; ind: Indicator; world?: Indicator }) {
  const v = ind.value;
  const w = world?.value ?? null;
  let diff: React.ReactNode = null;
  if (spec.compare && v !== null && w !== null && w !== 0) {
    const pct = ((v - w) / Math.abs(w)) * 100;
    const up = pct >= 0;
    const good = spec.better ? (spec.better === "high" ? up : !up) : null;
    const color = good === null ? "text-muted" : good ? "text-emerald-500" : "text-rose-400";
    diff = (
      <span className={`text-[11px] ${color}`} title={`Média mundial: ${spec.format(w)}`}>
        {up ? "▲" : "▼"} {formatNumber(Math.abs(pct), 0)}% vs. mundo
      </span>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-elev-2/60 px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{spec.label}</div>
      <div className="display mt-1 text-2xl font-medium leading-tight text-fg">
        {v === null ? <span className="text-base text-faint">indisponível</span> : <CountUp value={v} format={spec.format} />}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-faint">
        <span>
          {ind.year ? `${ind.year} · ` : ""}
          {ind.source}
        </span>
        {diff}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, fmt }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: number; fmt: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-fg">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-fg">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DataTab({ country, neighbors, onSelectNeighbor }: Props) {
  const { data, loading, error, reload } = useFetch<IndicatorsResponse>(`/api/country/${country.cca3}/indicators`);

  const popSeries = useMemo(() => (data?.series.population ?? []).filter((p) => p.year >= 1994), [data]);
  const gdpSeries = useMemo(() => {
    if (!data) return [];
    const world = new Map(data.series.worldGdpPerCapita.map((p) => [p.year, p.value]));
    return data.series.gdpPerCapita
      .filter((p) => p.year >= 1994)
      .map((p) => ({ year: p.year, pais: p.value, mundo: world.get(p.year) ?? null }));
  }, [data]);

  const ind = data?.indicators;
  const densityFallback =
    country.population && country.area ? { value: country.population / country.area, year: null, source: "world-countries" } : null;

  return (
    <div className="space-y-6">
      {/* Cards de informação */}
      <section aria-label="Informações gerais" className="grid grid-cols-2 gap-2.5">
        {country.languages.length > 0 && <InfoCard label="Idiomas">{country.languages.join(", ")}</InfoCard>}
        {country.currencies.length > 0 && (
          <InfoCard label="Moeda">
            {country.currencies.map((c) => `${c.name} (${c.code}${c.symbol ? ` ${c.symbol}` : ""})`).join(", ")}
          </InfoCard>
        )}
        {(country.utcOffsets || country.timezones.length > 0) && (
          <InfoCard label={country.timezones.length > 1 ? `Fusos horários · ${country.timezones.length}` : "Fuso horário"}>
            <span title={country.timezones.join("\n")}>{country.utcOffsets ?? country.timezones[0]}</span>
            {country.timezones[0] && (
              <span className="block truncate text-[11px] text-faint">
                {country.timezones[0].replace(/_/g, " ")}
                {country.timezones.length > 1 ? " e outros" : ""}
              </span>
            )}
          </InfoCard>
        )}
        {country.callingCode && <InfoCard label="Código de discagem">{country.callingCode}</InfoCard>}
        {country.tld.length > 0 && <InfoCard label="Domínio de internet">{country.tld.join(", ")}</InfoCard>}
        {country.drivingSide && <InfoCard label="Lado da pista">{country.drivingSide === "left" ? "Esquerda" : "Direita"}</InfoCard>}
      </section>

      {/* Vizinhos */}
      <section aria-label="Países vizinhos">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Países vizinhos</h3>
        {neighbors.length === 0 ? (
          <p className="text-sm text-muted">{country.landlocked ? "Sem fronteiras terrestres." : "Sem fronteiras terrestres (ilha ou território isolado)."}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {neighbors.map((n) => (
              <li key={n.cca3}>
                <button
                  type="button"
                  onClick={() => onSelectNeighbor(n)}
                  className="focus-ring flex items-center gap-1.5 rounded-full border border-line bg-elev-2/60 py-1 pl-2 pr-3 text-xs text-fg transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagThumb(n.cca2)} alt="" width={18} height={12} className="h-3 w-[18px] rounded-[2px] object-cover" loading="lazy" />
                  {n.name}
                  <IconChevron width={12} height={12} className="text-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Indicadores */}
      <section aria-label="Indicadores">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Indicadores</h3>
        {loading && !data ? (
          <SkeletonCards n={6} />
        ) : error && !data ? (
          <p className="text-sm text-muted">Indicadores indisponíveis no momento.</p>
        ) : (
          <>
            {data && !data.available && data.error && (
              <p className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-elev-2/60 px-3 py-2 text-xs text-muted">
                <span>O Banco Mundial não respondeu a tempo. Mostrando o que há disponível.</span>
                <button type="button" onClick={() => reload()} className="focus-ring shrink-0 font-medium text-accent hover:underline">
                  Tentar de novo
                </button>
              </p>
            )}
            {data && !data.available && !data.error && (
              <p className="mb-3 rounded-xl border border-line bg-elev-2/60 px-3 py-2 text-xs text-muted">
                O Banco Mundial não publica séries para este território. Dados indisponíveis.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {SPECS.map((spec) => {
                let i = ind?.[spec.key] ?? { value: null, year: null, source: "Banco Mundial" };
                if (spec.key === "population" && i.value === null && country.population) i = { value: country.population, year: null, source: "Banco Mundial" };
                if (spec.key === "area" && i.value === null && country.area) i = { value: country.area, year: null, source: "world-countries" };
                if (spec.key === "density" && i.value === null && densityFallback) i = densityFallback;
                return <StatCard key={spec.key} spec={spec} ind={i} world={data?.world[spec.key]} />;
              })}
            </div>
          </>
        )}
      </section>

      {/* Gráficos */}
      {loading && !data ? (
        <Skeleton className="h-44" />
      ) : (
        <>
          {popSeries.length > 2 && (
            <section aria-label="Evolução da população" className="rounded-2xl border border-line bg-elev-2/60 p-3">
              <h3 className="mb-1 text-xs font-medium text-fg">População · {popSeries[0].year}–{popSeries[popSeries.length - 1].year}</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={popSeries} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="popFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--fg-faint)" }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--fg-faint)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v, 0)} />
                    <Tooltip content={<ChartTooltip fmt={(v) => formatCompact(v, 2)} />} />
                    <Area type="monotone" dataKey="value" name="População" stroke="var(--accent)" strokeWidth={2} fill="url(#popFill)" isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
          {gdpSeries.length > 2 && (
            <section aria-label="PIB per capita comparado com a média mundial" className="rounded-2xl border border-line bg-elev-2/60 p-3">
              <h3 className="mb-1 flex items-center justify-between text-xs font-medium text-fg">
                <span>PIB per capita (US$ correntes)</span>
                <span className="flex items-center gap-3 text-[10px] text-faint">
                  <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-3 bg-accent" /> {country.name}</span>
                  <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-3 bg-sky-400" /> Média mundial</span>
                </span>
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gdpSeries} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--fg-faint)" }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--fg-faint)" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v, 0)} />
                    <Tooltip content={<ChartTooltip fmt={(v) => `US$ ${formatNumber(v, 0)}`} />} />
                    <Line type="monotone" dataKey="pais" name={country.name} stroke="var(--accent)" strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="mundo" name="Média mundial" stroke="#38bdf8" strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-[11px] text-faint">
        Fontes: Banco Mundial (indicadores e séries), PNUD via Wikidata (IDH), dataset world-countries (dados gerais).
      </p>
    </div>
  );
}
