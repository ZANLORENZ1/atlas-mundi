"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { normalize } from "@/lib/isoMap";
import { flagThumb } from "@/lib/format";
import type { CountrySummary } from "@/types";
import { IconSearch } from "@/components/ui/Icons";

interface Props {
  countries: CountrySummary[];
  onPick: (c: CountrySummary) => void;
  compact?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBox({ countries, onPick, compact, placeholder = "Buscar país…", autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Ranking: nome em português primeiro, depois código exato, nome em inglês e, por fim, trechos.
  const results = useMemo(() => {
    const n = normalize(q);
    if (!n) return [];
    const scored: Array<{ c: CountrySummary; s: number }> = [];
    for (const c of countries) {
      const pt = normalize(c.name);
      const en = normalize(c.nameEn);
      let s = 0;
      if (pt === n) s = 100;
      else if (pt.startsWith(n)) s = 80;
      else if (n.length <= 3 && (normalize(c.cca2) === n || normalize(c.cca3) === n)) s = 70;
      else if (pt.split(/[\s-]+/).some((w) => w.startsWith(n))) s = 60;
      else if (en.startsWith(n)) s = 50;
      else if (pt.includes(n) || en.includes(n)) s = 20;
      if (s) scored.push({ c, s: s + Math.min(9, Math.log10(c.population + 1)) / 10 });
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 8).map((x) => x.c);
  }, [q, countries]);

  // Atalho "/" foca a busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (c: CountrySummary) => {
    onPick(c);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={`relative ${compact ? "w-full" : "w-full max-w-xl"}`}>
      <div className={`glass flex items-center gap-2 rounded-full shadow-lg ${compact ? "px-3 py-1.5" : "px-4 py-2.5"}`}>
        <IconSearch className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Buscar país"
          autoFocus={autoFocus}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              pick(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          className={`w-full bg-transparent text-fg outline-none placeholder:text-faint ${compact ? "text-sm" : "text-base"}`}
        />
        {!compact && (
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-faint sm:inline">/</kbd>
        )}
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="glass absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl py-1 shadow-xl"
          >
            {results.map((c, i) => (
              <li
                key={c.cca3}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm ${i === active ? "bg-accent-soft" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagThumb(c.cca2)} alt="" width={22} height={15} className="h-[15px] w-[22px] rounded-[2px] object-cover shadow-sm" loading="lazy" />
                <span className="flex-1 text-fg">{c.name}</span>
                <span className="text-xs text-faint">{c.region}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
