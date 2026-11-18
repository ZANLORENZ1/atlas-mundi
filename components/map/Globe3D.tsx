"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import type { MapFeature } from "@/lib/geo";

interface Props {
  features: MapFeature[];
  colorFor: (f: MapFeature) => string;
  selected: string | null;
  hovered: string | null;
  theme: "dark" | "light";
  onSelect: (f: MapFeature) => void;
  onHover: (f: MapFeature | null) => void;
}

interface PolyDatum {
  mf: MapFeature;
  type: "Feature";
  geometry: MapFeature["feature"]["geometry"];
  properties: { name: string };
}

/** Resolve `var(--x)` para a cor computada, pois o three.js não entende variáveis CSS. */
function resolveColor(c: string): string {
  if (!c.startsWith("var(")) return c;
  const name = c.slice(4, -1).trim();
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#334";
}

export default function Globe3D({ features, colorFor, selected, hovered, theme, onSelect, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const polygons = useMemo<PolyDatum[]>(
    () =>
      features.map((mf) => ({
        mf,
        type: "Feature",
        geometry: mf.feature.geometry,
        properties: { name: mf.name },
      })),
    [features],
  );

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: theme === "dark" ? "#0b2a55" : "#a9c6e6",
        emissive: theme === "dark" ? "#061a35" : "#5f8fc4",
        emissiveIntensity: theme === "dark" ? 0.6 : 0.25,
        shininess: 12,
      }),
    [theme],
  );

  // Rotação suave; pausa quando um país está selecionado ou em hover
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = !selected && !hovered;
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    controls.minDistance = 120;
    controls.maxDistance = 600;
  }, [selected, hovered, size]);

  // Vai até o país selecionado
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !selected) return;
    const f = features.find((x) => x.cca3 === selected);
    if (!f) return;
    const desktop = size.w >= 1024;
    g.pointOfView({ lat: f.centroid[1] - (desktop ? 0 : 12), lng: f.centroid[0] + (desktop ? 18 : 0), altitude: 1.5 }, 1100);
  }, [selected, features, size.w]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const timer = setTimeout(() => g.pointOfView({ lat: -10, lng: -40, altitude: 2.2 }, 0), 0);
    return () => clearTimeout(timer);
  }, []);

  const strokeColor = theme === "dark" ? "rgba(200,215,240,0.55)" : "rgba(22,33,58,0.5)";

  return (
    <div ref={containerRef} className="h-full w-full" role="application" aria-label="Globo 3D interativo">
      {size.w > 0 && (
        <GlobeGL
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere
          atmosphereColor={theme === "dark" ? "#4f8ef7" : "#8fb6ea"}
          atmosphereAltitude={0.2}
          polygonsData={polygons}
          polygonCapColor={(d) => resolveColor(colorFor((d as PolyDatum).mf))}
          polygonSideColor={(d) => {
            const p = d as PolyDatum;
            return p.mf.cca3 && p.mf.cca3 === selected ? "rgba(233,180,87,0.6)" : "rgba(0,0,0,0.25)";
          }}
          polygonStrokeColor={(d) => {
            const p = d as PolyDatum;
            return p.mf.cca3 && p.mf.cca3 === selected ? "#e9b457" : strokeColor;
          }}
          polygonAltitude={(d) => {
            const p = d as PolyDatum;
            if (p.mf.cca3 && p.mf.cca3 === selected) return 0.07;
            if (p.mf.cca3 && p.mf.cca3 === hovered) return 0.035;
            return 0.008;
          }}
          polygonsTransitionDuration={250}
          polygonLabel={(d) => {
            const p = d as PolyDatum;
            const c = p.mf.country;
            const flag = c ? `<img src="https://flagcdn.com/w40/${c.cca2.toLowerCase()}.png" alt="" style="width:22px;height:15px;object-fit:cover;border-radius:2px;margin-right:8px;vertical-align:-3px">` : "";
            const name = p.mf.name.replace(/[<>&"]/g, "");
            const extra = c ? "" : ` <span style="color:#8a91a3">· dados indisponíveis</span>`;
            return `<div style="font-family:Inter,system-ui,sans-serif;font-size:13px;padding:6px 10px;border-radius:10px;background:rgba(13,21,39,0.92);color:#eef1f8;border:1px solid rgba(255,255,255,0.12);box-shadow:0 8px 24px rgba(0,0,0,.4)">${flag}${name}${extra}</div>`;
          }}
          onPolygonHover={(d) => onHover(d ? (d as PolyDatum).mf : null)}
          onPolygonClick={(d) => onSelect((d as PolyDatum).mf)}
        />
      )}
    </div>
  );
}
