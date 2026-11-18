import { interpolateRgb, piecewise } from "d3-interpolate";
import { scaleLinear, scaleLog } from "d3-scale";
import type { ChoroplethResponse, ColorMode, CountrySummary } from "@/types";
import { formatCompact, formatNumber } from "@/lib/format";

export const COLOR_MODE_LABEL: Record<ColorMode, string> = {
  continent: "Continente",
  population: "População",
  gdp: "PIB per capita",
  hdi: "IDH",
  life: "Expectativa de vida",
};

export const CONTINENT_COLORS: Record<string, string> = {
  África: "#d9822b",
  Américas: "#3f8f6b",
  Ásia: "#c0504d",
  Europa: "#4f6fb5",
  Oceania: "#8e63b5",
  Antártida: "#8fa3b8",
};

export const NO_DATA_COLOR = "var(--land-nodata)";

const RAMPS: Record<Exclude<ColorMode, "continent">, string[]> = {
  population: ["#f1e7c8", "#e39b3a", "#7a2a0c"],
  gdp: ["#dfeee3", "#3f9f7a", "#0b3d3a"],
  hdi: ["#f3dfe7", "#b85ca3", "#3b0f4a"],
  life: ["#e2eefc", "#4b8fd6", "#102a63"],
};

export interface LegendSpec {
  mode: ColorMode;
  type: "categorical" | "sequential";
  items?: Array<{ label: string; color: string }>;
  gradient?: string; // css linear-gradient
  ticks?: Array<{ label: string; pct: number }>;
  title: string;
  source: string;
}

export interface ColorScale {
  colorFor: (cca3: string | null, country: CountrySummary | null) => string;
  legend: LegendSpec;
}

export function buildColorScale(mode: ColorMode, choropleth: ChoroplethResponse | null): ColorScale {
  if (mode === "continent") {
    return {
      colorFor: (_cca3, c) => (c ? (CONTINENT_COLORS[c.region] ?? "var(--land)") : NO_DATA_COLOR),
      legend: {
        mode,
        type: "categorical",
        title: "Continente",
        source: "world-countries",
        items: Object.entries(CONTINENT_COLORS).map(([label, color]) => ({ label, color })),
      },
    };
  }

  const ramp = piecewise(interpolateRgb, RAMPS[mode]) as (t: number) => string;
  const gradient = `linear-gradient(90deg, ${RAMPS[mode].join(", ")})`;

  let domain: [number, number];
  let log = false;
  let value: (cca3: string, c: CountrySummary | null) => number | null;
  let format: (v: number) => string;
  let title: string;
  let source: string;

  switch (mode) {
    case "population":
      domain = [2e5, 1.4e9];
      log = true;
      value = (_c, c) => (c && c.population > 0 ? c.population : null);
      format = (v) => formatCompact(v, 0);
      title = "População";
      source = "Banco Mundial";
      break;
    case "gdp":
      domain = [500, 100_000];
      log = true;
      value = (cca3) => choropleth?.gdpPerCapita[cca3]?.value ?? null;
      format = (v) => `US$ ${formatCompact(v, 0)}`;
      title = "PIB per capita";
      source = "Banco Mundial";
      break;
    case "hdi":
      domain = [0.4, 0.96];
      value = (cca3) => choropleth?.hdi[cca3]?.value ?? null;
      format = (v) => formatNumber(v, 2);
      title = "IDH";
      source = "PNUD via Wikidata";
      break;
    case "life":
    default:
      domain = [52, 85];
      value = (cca3) => choropleth?.lifeExpectancy[cca3]?.value ?? null;
      format = (v) => `${formatNumber(v, 0)} anos`;
      title = "Expectativa de vida";
      source = "Banco Mundial";
      break;
  }

  const scale = (log ? scaleLog() : scaleLinear()).domain(domain).range([0, 1]).clamp(true);
  const tickVals = log
    ? [domain[0], Math.sqrt(domain[0] * domain[1]), domain[1]]
    : [domain[0], (domain[0] + domain[1]) / 2, domain[1]];

  return {
    colorFor: (cca3, c) => {
      if (!cca3) return NO_DATA_COLOR;
      const v = value(cca3, c);
      if (v === null || !Number.isFinite(v)) return NO_DATA_COLOR;
      return ramp(scale(v));
    },
    legend: {
      mode,
      type: "sequential",
      title,
      source,
      gradient,
      ticks: tickVals.map((v) => ({ label: format(v), pct: scale(v) * 100 })),
    },
  };
}
