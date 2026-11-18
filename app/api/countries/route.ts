import { NextResponse, connection } from "next/server";
import { getAllCountries } from "@/lib/countries";

export async function GET() {
  await connection(); // sempre em tempo de requisição (não pré-renderiza no build)
  try {
    const list = await getAllCountries();
    return NextResponse.json(list, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "erro" }, { status: 502 });
  }
}
