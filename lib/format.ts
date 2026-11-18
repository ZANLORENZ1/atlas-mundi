const nf = new Intl.NumberFormat("pt-BR");

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

/** Abrevia grandes números: 1,2 mi, 3,4 bi, 2,1 tri. */
export function formatCompact(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${formatNumber(n / 1e12, digits)} tri`;
  if (abs >= 1e9) return `${formatNumber(n / 1e9, digits)} bi`;
  if (abs >= 1e6) return `${formatNumber(n / 1e6, digits)} mi`;
  if (abs >= 1e3) return `${formatNumber(n / 1e3, digits)} mil`;
  return nf.format(Math.round(n));
}

export function formatUsd(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `US$ ${formatCompact(n, digits)}`;
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${formatNumber(n, digits)}%`;
}

export function formatArea(km2: number | null | undefined): string {
  if (!km2) return "—";
  return `${formatCompact(km2, km2 >= 1e6 ? 2 : 0)} km²`;
}

/** "há 3h", "há 2 dias" */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  const m = Math.floor(d / 30);
  return `há ${m} ${m === 1 ? "mês" : "meses"}`;
}

/** Miniatura da bandeira (emojis de bandeira não aparecem no Windows). */
export function flagThumb(cca2: string, width: 20 | 40 | 80 = 40): string {
  return `https://flagcdn.com/w${width}/${cca2.toLowerCase()}.png`;
}

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export function formatYearLabel(year: number): string {
  if (year < 0) return `${Math.abs(year)} a.C.`;
  return String(year);
}
