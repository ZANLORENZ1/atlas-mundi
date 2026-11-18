import { NextResponse } from "next/server";
import { getWorldNews } from "@/lib/news";

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const data = await getWorldNews(refresh);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (err) {
    return NextResponse.json(
      { items: [], sources: [], fetchedAt: new Date().toISOString(), error: err instanceof Error ? err.message : "erro" },
      { status: 200 },
    );
  }
}
