"use client";

interface Props {
  label: string;
  color?: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export default function Chip({ label, color = "var(--accent)", count, active = false, onClick, small }: Props) {
  const style = active
    ? { background: color, color: "#fff", borderColor: color }
    : { background: `color-mix(in srgb, ${color} 14%, transparent)`, color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` };
  const cls = `focus-ring inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors ${
    small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
  } ${onClick ? "cursor-pointer hover:brightness-110" : ""}`;
  const content = (
    <>
      <span>{label}</span>
      {count !== undefined && (
        <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-black/10 dark:bg-white/10"}`}>{count}</span>
      )}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick} aria-pressed={active}>
        {content}
      </button>
    );
  }
  return (
    <span className={cls} style={style}>
      {content}
    </span>
  );
}
