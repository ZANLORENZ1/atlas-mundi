import type { NewsCategory, NewsLanguage } from "@/types";

/**
 * Veículos com RSS direto. Para adicionar um novo veículo basta incluir
 * um objeto aqui: nome, URL do RSS, idioma e (opcionalmente) a categoria
 * padrão usada quando o título não permite classificar.
 *
 * Os feeds diretos são baixados uma vez (cache de 30 min) e filtrados
 * pelo nome do país no título. O Google News RSS é a fonte base e é
 * consultado por país (PT e EN).
 */
export interface NewsSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  language: Exclude<NewsLanguage, "other">;
  scope: "nacional" | "internacional";
  defaultCategory?: NewsCategory;
}

export const NEWS_SOURCES: NewsSource[] = [
  // ---- Nacionais (PT) ----
  {
    id: "g1",
    name: "G1",
    url: "https://g1.globo.com/rss/g1/",
    domain: "g1.globo.com",
    language: "pt",
    scope: "nacional",
  },
  {
    id: "folha",
    name: "Folha de S.Paulo",
    url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    domain: "folha.uol.com.br",
    language: "pt",
    scope: "nacional",
  },
  {
    id: "folha-mundo",
    name: "Folha de S.Paulo",
    url: "https://feeds.folha.uol.com.br/mundo/rss091.xml",
    domain: "folha.uol.com.br",
    language: "pt",
    scope: "nacional",
    defaultCategory: "politica",
  },
  {
    id: "estadao",
    name: "Estadão",
    url: "https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml",
    domain: "estadao.com.br",
    language: "pt",
    scope: "nacional",
  },
  {
    id: "oglobo",
    name: "O Globo",
    url: "https://oglobo.globo.com/rss.xml",
    domain: "oglobo.globo.com",
    language: "pt",
    scope: "nacional",
  },
  {
    id: "cnnbrasil",
    name: "CNN Brasil",
    url: "https://www.cnnbrasil.com.br/feed/",
    domain: "cnnbrasil.com.br",
    language: "pt",
    scope: "nacional",
  },
  {
    id: "infomoney",
    name: "InfoMoney",
    url: "https://www.infomoney.com.br/feed/",
    domain: "infomoney.com.br",
    language: "pt",
    scope: "nacional",
    defaultCategory: "economia",
  },
  {
    id: "valor",
    name: "Valor Econômico",
    url: "https://valor.globo.com/rss/valor/",
    domain: "valor.globo.com",
    language: "pt",
    scope: "nacional",
    defaultCategory: "economia",
  },
  {
    id: "exame",
    name: "Exame",
    url: "https://exame.com/feed/",
    domain: "exame.com",
    language: "pt",
    scope: "nacional",
    defaultCategory: "economia",
  },
  {
    id: "dw-pt",
    name: "DW Brasil",
    url: "https://rss.dw.com/xml/rss-br-all",
    domain: "dw.com",
    language: "pt",
    scope: "internacional",
  },
  // ---- Internacionais (EN) ----
  {
    id: "bbc",
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    domain: "bbc.com",
    language: "en",
    scope: "internacional",
  },
  {
    id: "reuters",
    // A Reuters não publica mais RSS público; o feed da agência é o oficial.
    name: "Reuters",
    url: "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best",
    domain: "reuters.com",
    language: "en",
    scope: "internacional",
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    domain: "aljazeera.com",
    language: "en",
    scope: "internacional",
  },
  {
    id: "guardian",
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    domain: "theguardian.com",
    language: "en",
    scope: "internacional",
  },
  {
    id: "dw-en",
    name: "DW News",
    url: "https://rss.dw.com/rdf/rss-en-all",
    domain: "dw.com",
    language: "en",
    scope: "internacional",
  },
  {
    id: "france24",
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    domain: "france24.com",
    language: "en",
    scope: "internacional",
  },
  {
    id: "npr",
    name: "NPR",
    url: "https://feeds.npr.org/1004/rss.xml",
    domain: "npr.org",
    language: "en",
    scope: "internacional",
  },
];

/** Feeds do Google News usados para a faixa "Manchetes do mundo". */
export const WORLD_FEEDS = [
  {
    id: "gn-top",
    name: "Google News",
    url: "https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419",
    language: "pt" as const,
  },
  {
    id: "gn-world",
    name: "Google News",
    url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=pt-BR&gl=BR&ceid=BR:pt-419",
    language: "pt" as const,
  },
  {
    id: "gn-business",
    name: "Google News",
    url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=pt-BR&gl=BR&ceid=BR:pt-419",
    language: "pt" as const,
  },
];

export function googleNewsSearchUrl(query: string, language: "pt" | "en"): string {
  const q = encodeURIComponent(query);
  return language === "pt"
    ? `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    : `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}
