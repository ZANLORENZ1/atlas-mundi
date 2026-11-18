"use client";

import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { geoCentroid, geoArea } from "d3-geo";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";
import { buildGeoIndex, resolveFeature } from "@/lib/isoMap";
import type { CountrySummary } from "@/types";

export interface MapFeature {
  key: string; // id ou nome (único)
  feature: Feature<Geometry, { name: string }>;
  /** maior polígono, usado para enquadrar países com territórios distantes */
  mainFeature: Feature<Geometry, { name: string }>;
  cca3: string | null;
  name: string; // português quando disponível
  centroid: [number, number]; // [lon, lat]
  country: CountrySummary | null;
}

let topoPromise: Promise<Topology> | null = null;

export function loadTopology(): Promise<Topology> {
  if (!topoPromise) {
    topoPromise = fetch("/data/countries-110m.json").then((r) => {
      if (!r.ok) throw new Error("Falha ao carregar o mapa");
      return r.json() as Promise<Topology>;
    });
  }
  return topoPromise;
}

function largestPolygon(f: Feature<Geometry, { name: string }>): Feature<Geometry, { name: string }> {
  if (f.geometry.type !== "MultiPolygon") return f;
  const multi = f.geometry as MultiPolygon;
  let best: Polygon | null = null;
  let bestArea = -1;
  for (const coords of multi.coordinates) {
    const poly: Polygon = { type: "Polygon", coordinates: coords };
    const a = geoArea(poly);
    if (a > bestArea) {
      bestArea = a;
      best = poly;
    }
  }
  return best ? { ...f, geometry: best } : f;
}

export function buildMapFeatures(topo: Topology, countries: CountrySummary[]): MapFeature[] {
  const index = buildGeoIndex(countries);
  const obj = topo.objects.countries as GeometryCollection<{ name: string }>;
  const fc = feature(topo, obj);
  const out: MapFeature[] = [];
  for (const f of fc.features) {
    const name = f.properties?.name ?? "";
    const country = resolveFeature(index, f.id as string | number | undefined, name);
    const main = largestPolygon(f as Feature<Geometry, { name: string }>);
    const c = geoCentroid(main);
    out.push({
      key: String(f.id ?? name),
      feature: f as Feature<Geometry, { name: string }>,
      mainFeature: main,
      cca3: country?.cca3 ?? null,
      name: country?.name ?? name,
      centroid: [c[0], c[1]],
      country,
    });
  }
  return out;
}
