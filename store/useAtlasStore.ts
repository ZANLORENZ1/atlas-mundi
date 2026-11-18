"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorMode, ViewMode } from "@/types";

export type PanelTab = "dados" | "curiosidades" | "noticias";

interface AtlasState {
  selected: string | null; // cca3
  hovered: string | null; // cca3
  tab: PanelTab;
  view: ViewMode;
  colorMode: ColorMode;
  theme: "dark" | "light";
  favorites: string[]; // cca3
  compare: [string | null, string | null];
  compareOpen: boolean;
  favoritesOpen: boolean;
  select: (cca3: string | null, tab?: PanelTab) => void;
  setHovered: (cca3: string | null) => void;
  setTab: (tab: PanelTab) => void;
  setView: (view: ViewMode) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleTheme: () => void;
  toggleFavorite: (cca3: string) => void;
  setCompare: (slot: 0 | 1, cca3: string | null) => void;
  setCompareOpen: (open: boolean) => void;
  setFavoritesOpen: (open: boolean) => void;
}

export const useAtlasStore = create<AtlasState>()(
  persist(
    (set, get) => ({
      selected: null,
      hovered: null,
      tab: "dados",
      view: "2d",
      colorMode: "continent",
      theme: "dark",
      favorites: [],
      compare: [null, null],
      compareOpen: false,
      favoritesOpen: false,
      select: (cca3, tab) => set({ selected: cca3, tab: tab ?? get().tab, hovered: null }),
      setHovered: (cca3) => set({ hovered: cca3 }),
      setTab: (tab) => set({ tab }),
      setView: (view) => set({ view }),
      setColorMode: (colorMode) => set({ colorMode }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      toggleFavorite: (cca3) => {
        const favs = get().favorites;
        set({ favorites: favs.includes(cca3) ? favs.filter((f) => f !== cca3) : [...favs, cca3] });
      },
      setCompare: (slot, cca3) => {
        const next: [string | null, string | null] = [...get().compare] as [string | null, string | null];
        next[slot] = cca3;
        set({ compare: next });
      },
      setCompareOpen: (compareOpen) => set({ compareOpen }),
      setFavoritesOpen: (favoritesOpen) => set({ favoritesOpen }),
    }),
    {
      name: "atlas-mundi",
      partialize: (s) => ({ favorites: s.favorites, theme: s.theme, view: s.view, colorMode: s.colorMode }),
      // Reidratado manualmente após a montagem, para o 1º render bater com o HTML do servidor.
      skipHydration: true,
    },
  ),
);
