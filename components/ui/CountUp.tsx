"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface Props {
  value: number | null | undefined;
  format: (v: number) => string;
  duration?: number;
  className?: string;
}

/** Número que conta até o valor final. */
export default function CountUp({ value, format, duration = 1.1, className }: Props) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<number>(0);
  const prev = useRef(0);

  useEffect(() => {
    if (reduce || value === null || value === undefined || !Number.isFinite(value)) return;
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={className}>—</span>;
  }
  // Com movimento reduzido, mostra o valor final direto.
  const shown = reduce ? value : display;
  return (
    <span className={className} aria-label={format(value)}>
      {format(shown)}
    </span>
  );
}
