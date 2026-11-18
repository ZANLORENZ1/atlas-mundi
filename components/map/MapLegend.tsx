"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LegendSpec } from "@/lib/colors";

export default function MapLegend({ legend }: { legend: LegendSpec }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={legend.mode}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
        className="glass rounded-2xl px-4 py-3 text-xs shadow-lg"
        aria-label={`Legenda: ${legend.title}`}
      >
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span className="font-medium text-fg">{legend.title}</span>
          <span className="text-[10px] uppercase tracking-wider text-faint">{legend.source}</span>
        </div>
        {legend.type === "categorical" && legend.items && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {legend.items.map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-muted">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} aria-hidden />
                {it.label}
              </li>
            ))}
          </ul>
        )}
        {legend.type === "sequential" && legend.gradient && (
          <div className="w-52">
            <div className="h-2.5 w-full rounded-full" style={{ background: legend.gradient }} />
            <div className="relative mt-1 h-4 text-[10px] text-muted">
              {legend.ticks?.map((t, i) => (
                <span
                  key={i}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${t.pct}%`,
                    transform: i === 0 ? "none" : i === (legend.ticks?.length ?? 0) - 1 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--land-nodata)" }} aria-hidden />
              sem dados
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
