import { NextResponse } from "next/server";
import { findRaw } from "@/lib/countries";
import { getWikiSummary } from "@/lib/wikipedia";
import { getCountryEntity, getDishes, getEvents, getPeople, getSports, getUnescoSites } from "@/lib/wikidata";
import type { FactsResponse } from "@/types";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const raw = findRaw(code);
  if (!raw) return NextResponse.json({ error: "país não encontrado" }, { status: 404 });

  const errors: string[] = [];
  let entity: Awaited<ReturnType<typeof getCountryEntity>> = null;
  try {
    entity = await getCountryEntity(raw.cca2);
  } catch (e) {
    errors.push(`wikidata: ${msg(e)}`);
  }

  const summaryTask = getWikiSummary({
    pt: [entity?.ptTitle ?? "", raw.namePt],
    en: [entity?.enTitle ?? "", raw.nameEn],
  });

  const qid = entity?.qid ?? null;
  const [summary, unesco, dishes, sports, people, events] = await Promise.allSettled([
    summaryTask,
    qid ? getUnescoSites(qid) : Promise.resolve([]),
    qid ? getDishes(qid) : Promise.resolve([]),
    qid ? getSports(qid) : Promise.resolve([]),
    qid ? getPeople(qid) : Promise.resolve([]),
    qid ? getEvents(qid) : Promise.resolve([]),
  ]);

  const pick = <T,>(r: PromiseSettledResult<T>, name: string, fallback: T): T => {
    if (r.status === "fulfilled") return r.value;
    errors.push(`${name}: ${msg(r.reason)}`);
    return fallback;
  };

  const body: FactsResponse = {
    code: raw.cca2,
    wikidataId: qid,
    summary: pick(summary, "wikipedia", null),
    inception: entity?.inception ?? null,
    unesco: pick(unesco, "unesco", []),
    dishes: pick(dishes, "pratos", []),
    sports: pick(sports, "esportes", []),
    people: pick(people, "personalidades", []),
    events: pick(events, "eventos", []),
    errors,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
