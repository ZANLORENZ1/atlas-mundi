"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import { interpolateZoom } from "d3-interpolate";
import type { MapFeature } from "@/lib/geo";

interface Props {
  features: MapFeature[];
  colorFor: (f: MapFeature) => string;
  selected: string | null; // cca3
  onSelect: (f: MapFeature) => void;
  onHover: (f: MapFeature | null, pos: { x: number; y: number } | null) => void;
  resetSignal?: number;
}

export default function WorldMap2D({ features, colorFor, selected, onSelect, onHover, resetSignal }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const animRef = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [k, setK] = useState(1);

  // Tamanho do container
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

  const projection = useMemo(() => {
    if (!size.w || !size.h) return null;
    return geoNaturalEarth1().fitExtent(
      [
        [8, 8],
        [size.w - 8, size.h - 8],
      ],
      { type: "Sphere" },
    );
  }, [size]);

  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  const paths = useMemo(() => {
    if (!path) return [];
    return features.map((f) => ({ f, d: path(f.feature) ?? "" }));
  }, [features, path]);

  const spherePath = useMemo(() => (path ? (path({ type: "Sphere" }) ?? "") : ""), [path]);
  const graticulePath = useMemo(() => (path ? (path(geoGraticule10()) ?? "") : ""), [path]);

  const applyTransform = useCallback((t: ZoomTransform) => {
    transformRef.current = t;
    if (gRef.current) gRef.current.setAttribute("transform", t.toString());
    setK(t.k);
  }, []);

  // Zoom / arrastar
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !size.w) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 16])
      .translateExtent([
        [-size.w * 0.25, -size.h * 0.25],
        [size.w * 1.25, size.h * 1.25],
      ])
      .filter((event: Event) => {
        const e = event as MouseEvent;
        return !e.ctrlKey && (e.type !== "mousedown" || e.button === 0);
      })
      .on("zoom", (event) => applyTransform(event.transform));
    zoomRef.current = z;
    select(svg).call(z).on("dblclick.zoom", null);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [size, applyTransform]);

  const flyTo = useCallback(
    (target: ZoomTransform) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z || !size.w) return;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const from = transformRef.current;
      const w = size.w;
      const h = size.h;
      // centro da vista em coordenadas do mapa + largura visível
      const a: [number, number, number] = [(w / 2 - from.x) / from.k, (h / 2 - from.y) / from.k, w / from.k];
      const b: [number, number, number] = [(w / 2 - target.x) / target.k, (h / 2 - target.y) / target.k, w / target.k];
      const interp = interpolateZoom(a, b);
      const duration = Math.min(1400, Math.max(500, interp.duration));
      const start = performance.now();
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const [cx, cy, vw] = interp(ease(t));
        const kk = w / vw;
        const tr = zoomIdentity.translate(w / 2 - cx * kk, h / 2 - cy * kk).scale(kk);
        select(svg).call(z.transform, tr);
        if (t < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [size],
  );

  // Zoom animado até o país selecionado
  useEffect(() => {
    if (!path || !size.w || !selected) return;
    const f = features.find((x) => x.cca3 === selected);
    if (!f) return;
    const [[x0, y0], [x1, y1]] = path.bounds(f.mainFeature);
    const dx = Math.max(1, x1 - x0);
    const dy = Math.max(1, y1 - y0);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const desktop = size.w >= 1024;
    const availW = desktop ? size.w - 460 : size.w; // espaço para o painel lateral
    const availH = desktop ? size.h : size.h * 0.5; // bottom sheet no mobile
    const kk = Math.max(1.2, Math.min(9, 0.5 / Math.max(dx / availW, dy / availH)));
    const offsetX = desktop ? -230 : 0;
    const offsetY = desktop ? 0 : -size.h * 0.22;
    const t = zoomIdentity.translate(size.w / 2 + offsetX - cx * kk, size.h / 2 + offsetY - cy * kk).scale(kk);
    flyTo(t);
  }, [selected, features, path, size, flyTo]);

  // Resetar vista
  useEffect(() => {
    if (!resetSignal) return;
    flyTo(zoomIdentity);
  }, [resetSignal, flyTo]);

  const handleMove = useCallback(
    (f: MapFeature) => (e: React.MouseEvent) => {
      onHover(f, { x: e.clientX, y: e.clientY });
    },
    [onHover],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full select-none" aria-label="Mapa-múndi interativo" role="application">
      {size.w > 0 && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="block h-full w-full touch-none"
          style={{ cursor: "grab" }}
        >
          <defs>
            <radialGradient id="ocean" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="var(--ocean-3)" />
              <stop offset="55%" stopColor="var(--ocean-2)" />
              <stop offset="100%" stopColor="var(--ocean-1)" />
            </radialGradient>
            <filter id="sphere-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#000" floodOpacity="0.45" />
            </filter>
          </defs>
          <g ref={gRef}>
            <path d={spherePath} fill="url(#ocean)" filter="url(#sphere-shadow)" />
            <path d={graticulePath} fill="none" stroke="var(--fg)" strokeOpacity={0.07} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            {paths.map(({ f, d }) => {
              const isSel = selected !== null && f.cca3 === selected;
              const dim = selected !== null && !isSel && k > 2.5;
              return (
                <path
                  key={f.key}
                  d={d}
                  className={`country${isSel ? " is-selected" : ""}${dim ? " is-dim" : ""}`}
                  fill={colorFor(f)}
                  stroke={isSel ? "var(--accent)" : "var(--border)"}
                  strokeWidth={isSel ? 1.6 : 0.55}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  tabIndex={0}
                  role="button"
                  aria-label={f.name}
                  aria-pressed={isSel}
                  onMouseEnter={handleMove(f)}
                  onMouseMove={handleMove(f)}
                  onMouseLeave={() => onHover(null, null)}
                  onFocus={() => onHover(f, null)}
                  onBlur={() => onHover(null, null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(f);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(f);
                    }
                  }}
                />
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
