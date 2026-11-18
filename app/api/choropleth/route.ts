import { NextResponse, connection } from "next/server";
import { getIndicatorForAll } from "@/lib/worldBank";
import { getHdiForAll } from "@/lib/wikidata";
import type { ChoroplethResponse } from "@/types";

export async function GET() {
  await connection(); // sempre em tempo de requisição (não pré-renderiza no build)
  const [gdp, life, hdi] = await Promise.allSettled([
    getIndicatorForAll("NY.GDP.PCAP.CD"),
    getIndicatorForAll("SP.DYN.LE00.IN"),
    getHdiForAll(),
  ]);
  const body: ChoroplethResponse = {
    gdpPerCapita: gdp.status === "fulfilled" ? gdp.value : {},
    lifeExpectancy: life.status === "fulfilled" ? life.value : {},
    hdi: hdi.status === "fulfilled" ? hdi.value : {},
    fetchedAt: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
