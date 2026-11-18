import { NextResponse } from "next/server";
import { getCountry } from "@/lib/countries";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Za-z]{2,3}$/.test(code)) {
    return NextResponse.json({ error: "código inválido" }, { status: 400 });
  }
  try {
    const country = await getCountry(code);
    if (!country) return NextResponse.json({ error: "país não encontrado" }, { status: 404 });
    return NextResponse.json(country, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "erro" }, { status: 502 });
  }
}
