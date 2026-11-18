import { XMLParser } from "fast-xml-parser";
import { fetchWithTimeout } from "@/lib/http";

/**
 * Parser mínimo de RSS 2.0 / RDF / Atom. Guarda apenas título, link,
 * fonte, data e categorias do feed (nada de conteúdo ou imagens).
 */
export interface RawFeedItem {
  title: string;
  link: string;
  publishedAt: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  categories: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  trimValues: true,
  processEntities: true,
});

type Node = Record<string, unknown> | string | number | null | undefined;

function text(node: Node): string | null {
  if (node === null || node === undefined) return null;
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o["#cdata"] === "string") return o["#cdata"];
    if (typeof o["#text"] === "string" || typeof o["#text"] === "number") return String(o["#text"]);
    if (typeof o["@_href"] === "string") return o["@_href"];
  }
  return null;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function pickLink(item: Record<string, unknown>): string | null {
  const link = item.link;
  if (typeof link === "string") return link;
  const links = asArray(link as Node | Node[]);
  // Atom: prefer rel="alternate"
  for (const l of links) {
    if (l && typeof l === "object") {
      const o = l as Record<string, unknown>;
      if ((o["@_rel"] === undefined || o["@_rel"] === "alternate") && typeof o["@_href"] === "string") return o["@_href"];
    }
  }
  for (const l of links) {
    const t = text(l);
    if (t) return t;
  }
  const guid = text(item.guid as Node);
  if (guid && /^https?:\/\//.test(guid)) return guid;
  return null;
}

function pickDate(item: Record<string, unknown>): string | null {
  const candidates = [item.pubDate, item.published, item.updated, item["dc:date"], item.date];
  for (const c of candidates) {
    const t = text(c as Node);
    if (!t) continue;
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function parseFeed(xml: string): RawFeedItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rss = doc.rss as Record<string, unknown> | undefined;
  const rdf = doc["rdf:RDF"] as Record<string, unknown> | undefined;
  const feed = doc.feed as Record<string, unknown> | undefined;

  let rawItems: Record<string, unknown>[] = [];
  if (rss) {
    const channel = rss.channel as Record<string, unknown> | undefined;
    rawItems = asArray(channel?.item as Record<string, unknown> | Record<string, unknown>[]);
  } else if (rdf) {
    rawItems = asArray(rdf.item as Record<string, unknown> | Record<string, unknown>[]);
  } else if (feed) {
    rawItems = asArray(feed.entry as Record<string, unknown> | Record<string, unknown>[]);
  }

  const out: RawFeedItem[] = [];
  for (const item of rawItems) {
    const title = text(item.title as Node);
    const link = pickLink(item);
    if (!title || !link) continue;
    const source = item.source as Node;
    const sourceName = text(source);
    const sourceUrl =
      source && typeof source === "object" && typeof (source as Record<string, unknown>)["@_url"] === "string"
        ? ((source as Record<string, unknown>)["@_url"] as string)
        : null;
    const categories = asArray(item.category as Node | Node[])
      .map((c) => {
        if (c && typeof c === "object") {
          const o = c as Record<string, unknown>;
          return text(c) ?? (typeof o["@_term"] === "string" ? o["@_term"] : typeof o["@_label"] === "string" ? o["@_label"] : null);
        }
        return text(c);
      })
      .filter((c): c is string => !!c);
    out.push({
      title: decodeHtml(title),
      link,
      publishedAt: pickDate(item),
      sourceName: sourceName ? decodeHtml(sourceName) : null,
      sourceUrl,
      categories,
    });
  }
  return out;
}

/** Lê o corpo respeitando o charset (vários feeds brasileiros ainda usam ISO-8859-1). */
async function readXml(res: Response): Promise<string> {
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder("latin1").decode(buf.subarray(0, 200));
  const ct = res.headers.get("content-type") ?? "";
  const declared = /encoding=["']([\w-]+)["']/i.exec(head)?.[1] ?? /charset=([\w-]+)/i.exec(ct)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(declared.toLowerCase()).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

export async function fetchFeed(url: string, timeoutMs = 9000): Promise<RawFeedItem[]> {
  const res = await fetchWithTimeout(url, {
    timeoutMs,
    headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8" },
  });
  return parseFeed(await readXml(res));
}
