import { NextResponse } from "next/server";
import { findRaw } from "@/lib/countries";
import { getCountryNews } from "@/lib/news";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const raw = findRaw(code);
  if (!raw) return NextResponse.json({ error: "país não encontrado" }, { status: 404 });
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const data = await getCountryNews(
      { cca2: raw.cca2, namePt: raw.namePt, nameEn: raw.nameEn, demonyms: raw.demonyms },
      refresh,
    );
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (err) {
    return NextResponse.json(
      { items: [], sources: [], fetchedAt: new Date().toISOString(), error: err instanceof Error ? err.message : "erro" },
      { status: 200 },
    );
  }
}
