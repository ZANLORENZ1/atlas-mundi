import type { CountrySummary } from "@/types";

/**
 * Mapeia as feições do TopoJSON (world-atlas, id = ISO 3166-1 numérico)
 * para os códigos alpha-2/alpha-3 usados pelas APIs.
 *
 * Casos especiais:
 *  - Kosovo, Chipre do Norte e Somalilândia não têm id numérico no world-atlas
 *    (vêm como undefined) e são resolvidos pelo nome.
 *  - Taiwan (158), Palestina (275), Saara Ocidental (732) existem no REST
 *    Countries, mas podem não ter dados no World Bank.
 *  - Territórios sem entrada no REST Countries aparecem como "dados indisponíveis".
 */
export const SPECIAL_BY_NAME: Record<string, string | null> = {
  Kosovo: "XK",
  "N. Cyprus": null, // sem reconhecimento ISO: dados indisponíveis
  Somaliland: null,
};

/** Código alpha-3 que o World Bank usa quando difere do ISO. */
export const WORLD_BANK_CODE: Record<string, string> = {
  UNK: "XKX", // Kosovo (REST Countries usa UNK)
};

/** Países sem dados no World Bank (evita requisições inúteis). */
export const NO_WORLD_BANK = new Set(["TWN", "VAT", "ATF", "ESH", "ATA", "BVT", "HMD", "SGS", "UMI"]);

/** Nomes alternativos para busca de manchetes nos feeds diretos. */
export const NEWS_ALIASES: Record<string, string[]> = {
  US: ["EUA", "Estados Unidos", "U.S.", "US", "United States", "America", "norte-americano", "norte-americana", "Washington", "Trump"],
  GB: ["Reino Unido", "UK", "Britain", "British", "britânico", "britânica", "Inglaterra", "England", "Londres", "London"],
  BR: ["Brasil", "Brazil", "brasileiro", "brasileira", "Brazilian", "Lula", "Brasília"],
  CN: ["China", "chinês", "chinesa", "Chinese", "Pequim", "Beijing", "Xi Jinping"],
  RU: ["Rússia", "Russia", "russo", "russa", "Russian", "Moscou", "Moscow", "Putin", "Kremlin"],
  DE: ["Alemanha", "Germany", "alemão", "alemã", "German", "Berlim", "Berlin"],
  FR: ["França", "France", "francês", "francesa", "French", "Paris", "Macron"],
  JP: ["Japão", "Japan", "japonês", "japonesa", "Japanese", "Tóquio", "Tokyo"],
  KR: ["Coreia do Sul", "South Korea", "sul-coreano", "Seul", "Seoul"],
  KP: ["Coreia do Norte", "North Korea", "norte-coreano", "Pyongyang", "Kim Jong"],
  IN: ["Índia", "India", "indiano", "indiana", "Indian", "Nova Délhi", "New Delhi", "Modi"],
  AR: ["Argentina", "argentino", "argentina", "Argentine", "Buenos Aires", "Milei"],
  UA: ["Ucrânia", "Ukraine", "ucraniano", "ucraniana", "Ukrainian", "Kiev", "Kyiv", "Zelensky"],
  IL: ["Israel", "israelense", "Israeli", "Tel Aviv", "Netanyahu"],
  PS: ["Palestina", "Palestine", "palestino", "Palestinian", "Gaza", "Cisjordânia", "West Bank"],
  IR: ["Irã", "Iran", "iraniano", "Iranian", "Teerã", "Tehran"],
  TW: ["Taiwan", "taiwanês", "Taiwanese", "Taipei"],
  XK: ["Kosovo", "kosovar", "Pristina"],
  MX: ["México", "Mexico", "mexicano", "Mexican"],
  IT: ["Itália", "Italy", "italiano", "Italian", "Roma", "Rome"],
  ES: ["Espanha", "Spain", "espanhol", "Spanish", "Madri", "Madrid"],
  PT: ["Portugal", "português", "Portuguese", "Lisboa", "Lisbon"],
  VE: ["Venezuela", "venezuelano", "Venezuelan", "Caracas", "Maduro"],
  CA: ["Canadá", "Canada", "canadense", "Canadian", "Ottawa"],
  AU: ["Austrália", "Australia", "australiano", "Australian"],
  ZA: ["África do Sul", "South Africa", "sul-africano"],
  TR: ["Turquia", "Turkey", "Türkiye", "turco", "Turkish", "Ancara", "Erdogan"],
  SA: ["Arábia Saudita", "Saudi Arabia", "saudita", "Saudi", "Riad", "Riyadh"],
  EG: ["Egito", "Egypt", "egípcio", "Egyptian", "Cairo"],
  NL: ["Holanda", "Países Baixos", "Netherlands", "holandês", "Dutch"],
  CH: ["Suíça", "Switzerland", "suíço", "Swiss"],
  IS: ["Islândia", "Iceland", "islandês", "Icelandic", "Reykjavik"],
  PL: ["Polônia", "Poland", "polonês", "Polish", "Varsóvia", "Warsaw"],
  GR: ["Grécia", "Greece", "grego", "Greek", "Atenas", "Athens"],
  SY: ["Síria", "Syria", "sírio", "Syrian", "Damasco", "Damascus"],
  SD: ["Sudão", "Sudan", "sudanês", "Sudanese", "Cartum", "Khartoum"],
  CU: ["Cuba", "cubano", "Cuban", "Havana"],
  CL: ["Chile", "chileno", "Chilean", "Santiago"],
  CO: ["Colômbia", "Colombia", "colombiano", "Colombian", "Bogotá"],
  PE: ["Peru", "peruano", "Peruvian", "Lima"],
};

export interface GeoIndex {
  byNumeric: Map<string, CountrySummary>;
  byCca2: Map<string, CountrySummary>;
  byCca3: Map<string, CountrySummary>;
}

export function buildGeoIndex(list: CountrySummary[]): GeoIndex {
  const byNumeric = new Map<string, CountrySummary>();
  const byCca2 = new Map<string, CountrySummary>();
  const byCca3 = new Map<string, CountrySummary>();
  for (const c of list) {
    if (c.ccn3) byNumeric.set(c.ccn3, c);
    byCca2.set(c.cca2, c);
    byCca3.set(c.cca3, c);
  }
  return { byNumeric, byCca2, byCca3 };
}

/** Resolve uma feição do TopoJSON (id numérico + nome) para o país. */
export function resolveFeature(
  index: GeoIndex,
  id: string | number | undefined,
  name: string | undefined,
): CountrySummary | null {
  if (name && name in SPECIAL_BY_NAME) {
    const cca2 = SPECIAL_BY_NAME[name];
    return cca2 ? (index.byCca2.get(cca2) ?? null) : null;
  }
  if (id === undefined || id === null) return null;
  const key = String(id).padStart(3, "0");
  return index.byNumeric.get(key) ?? null;
}

export function toWorldBankCode(cca3: string): string {
  return WORLD_BANK_CODE[cca3] ?? cca3;
}

/** Normaliza para busca: minúsculas e sem acentos. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
