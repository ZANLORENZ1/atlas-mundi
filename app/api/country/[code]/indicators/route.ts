import { NextResponse } from "next/server";
import { findRaw } from "@/lib/countries";
import { getIndicators } from "@/lib/worldBank";
import { getCountryEntity } from "@/lib/wikidata";
import type { IndicatorsResponse } from "@/types";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const raw = findRaw(code);
  if (!raw) return NextResponse.json({ error: "país não encontrado" }, { status: 404 });

  // Banco Mundial e IDH (Wikidata) em paralelo; uma falha não derruba a outra.
  const [wb, entity] = await Promise.allSettled([getIndicators(raw.cca3), getCountryEntity(raw.cca2)]);

  let data: IndicatorsResponse;
  if (wb.status === "fulfilled") {
    data = wb.value;
  } else {
    console.warn(`[indicators] ${raw.cca3}:`, wb.reason instanceof Error ? wb.reason.message : wb.reason);
    data = {
      code: raw.cca3,
      available: false,
      error: true,
      indicators: {
        population: { value: null, year: null, source: "Banco Mundial" },
        area: { value: null, year: null, source: "Banco Mundial" },
        density: { value: null, year: null, source: "Banco Mundial" },
        gdp: { value: null, year: null, source: "Banco Mundial" },
        gdpPerCapita: { value: null, year: null, source: "Banco Mundial" },
        gdpGrowth: { value: null, year: null, source: "Banco Mundial" },
        inflation: { value: null, year: null, source: "Banco Mundial" },
        unemployment: { value: null, year: null, source: "Banco Mundial" },
        lifeExpectancy: { value: null, year: null, source: "Banco Mundial" },
        hdi: { value: null, year: null, source: "PNUD (via Wikidata)" },
        gini: { value: null, year: null, source: "Banco Mundial" },
      },
      world: {},
      series: { population: [], gdp: [], gdpPerCapita: [], worldGdpPerCapita: [], worldPopulation: [] },
    };
  }
  if (entity.status === "fulfilled" && entity.value?.hdi) {
    data = {
      ...data,
      indicators: {
        ...data.indicators,
        hdi: { value: entity.value.hdi.value, year: entity.value.hdi.year || null, source: "PNUD (via Wikidata)" },
      },
    };
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": data.error ? "no-store" : "public, max-age=300" },
  });
}
