import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import AtlasApp from "@/components/AtlasApp";
import { getCountryStatic } from "@/lib/countries";

type Params = { params: Promise<{ code: string }> };

/** Metadados Open Graph vêm do dataset local (sem rede). */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  "use cache";
  const { code } = await params;
  const c = getCountryStatic(code);
  if (!c) return { title: "País não encontrado" };
  const title = `${c.name} · Atlas Mundi`;
  const description = `${c.officialNamePt}${c.capital.length ? ` · Capital: ${c.capital.join(", ")}` : ""} · ${c.region}${c.subregion ? `, ${c.subregion}` : ""}. Dados, curiosidades e manchetes sobre ${c.name}.`;
  return {
    title: c.name,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: c.flagPng, width: 320, height: 213, alt: `Bandeira: ${c.name}` }],
      locale: "pt_BR",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [c.flagPng] },
  };
}

/** Marca a rota como dinâmica (o Next 16 exige isso dentro de Suspense). */
async function DynamicMarker() {
  await connection();
  return null;
}

/** O cliente lê o código da URL e abre o painel. */
export default function CountryPage() {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMarker />
      </Suspense>
      <AtlasApp />
    </>
  );
}
