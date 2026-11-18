"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtlasStore } from "@/store/useAtlasStore";
import { flagThumb } from "@/lib/format";
import type { CountrySummary } from "@/types";
import { IconClose, IconStar } from "@/components/ui/Icons";

interface Props {
  byCca3: Map<string, CountrySummary>;
  onSelect: (c: CountrySummary) => void;
}

export default function FavoritesDrawer({ byCca3, onSelect }: Props) {
  const open = useAtlasStore((s) => s.favoritesOpen);
  const setOpen = useAtlasStore((s) => s.setFavoritesOpen);
  const favorites = useAtlasStore((s) => s.favorites);
  const toggleFavorite = useAtlasStore((s) => s.toggleFavorite);
  const list = favorites.map((f) => byCca3.get(f)).filter((c): c is CountrySummary => !!c);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ background: "var(--scrim)" }}
          onClick={() => setOpen(false)}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Favoritos"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="glass absolute bottom-4 left-4 top-4 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl p-5"
            style={{ boxShadow: "var(--shadow)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display text-2xl text-fg">Favoritos</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="focus-ring rounded-full p-2 text-muted hover:bg-accent-soft">
                <IconClose />
              </button>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-muted">Nenhum país favoritado ainda. Use a estrela no painel do país.</p>
            ) : (
              <ul className="space-y-1.5">
                {list.map((c) => (
                  <li key={c.cca3} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(c);
                        setOpen(false);
                      }}
                      className="focus-ring flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent-soft"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flagThumb(c.cca2, 80)} alt="" width={32} height={21} className="h-[21px] w-8 rounded-[3px] object-cover shadow-sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-fg">{c.name}</span>
                        <span className="block truncate text-[11px] text-faint">{c.region}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => toggleFavorite(c.cca3)} aria-label={`Remover ${c.name} dos favoritos`} className="focus-ring rounded-full p-1.5 text-accent hover:bg-accent-soft">
                      <IconStar filled width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
