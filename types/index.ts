export type NewsCategory =
  | "politica"
  | "economia"
  | "tecnologia"
  | "cultura"
  | "esportes"
  | "ciencia"
  | "meio-ambiente"
  | "conflitos"
  | "sociedade";

export type NewsLanguage = "pt" | "en" | "other";

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceId: string;
  sourceDomain: string;
  publishedAt: string; // ISO
  language: NewsLanguage;
  category: NewsCategory;
}

export interface NewsSourceStatus {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface NewsResponse {
  items: NewsItem[];
  sources: NewsSourceStatus[];
  fetchedAt: string;
}

export interface CountrySummary {
  cca2: string;
  cca3: string;
  ccn3: string | null;
  name: string; // português
  nameEn: string;
  flagEmoji: string;
  flagSvg: string;
  flagPng: string;
  region: string;
  subregion: string;
  population: number;
  area: number;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CountryDetail extends CountrySummary {
  officialName: string;
  officialNamePt: string;
  capital: string[];
  languages: string[];
  currencies: Currency[];
  timezones: string[];
  /** ex.: "UTC+09:00" ou "UTC−10:00 a UTC−04:00" */
  utcOffsets: string | null;
  callingCode: string | null;
  tld: string[];
  drivingSide: "left" | "right" | null;
  borders: string[]; // cca3
  latlng: [number, number] | null;
  landlocked: boolean;
  unMember: boolean;
  independent: boolean | null;
  googleMaps: string | null;
  coatOfArms: string | null;
  demonymPt: string | null;
  continents: string[];
  startOfWeek: string | null;
}

export interface Indicator {
  value: number | null;
  year: number | null;
  source: string;
}

export interface SeriesPoint {
  year: number;
  value: number;
}

export type IndicatorKey =
  | "population"
  | "area"
  | "density"
  | "gdp"
  | "gdpPerCapita"
  | "gdpGrowth"
  | "inflation"
  | "unemployment"
  | "lifeExpectancy"
  | "hdi"
  | "gini";

export interface IndicatorsResponse {
  code: string;
  available: boolean;
  /** true quando a fonte falhou (temporário), diferente de "não publica dados" */
  error?: boolean;
  indicators: Record<IndicatorKey, Indicator>;
  world: Partial<Record<IndicatorKey, Indicator>>;
  series: {
    population: SeriesPoint[];
    gdp: SeriesPoint[];
    gdpPerCapita: SeriesPoint[];
    worldGdpPerCapita: SeriesPoint[];
    worldPopulation: SeriesPoint[];
  };
}

export interface WikiSummary {
  title: string;
  extract: string;
  image: string | null;
  url: string;
  lang: "pt" | "en";
}

export interface FactCard {
  id: string;
  label: string;
  description?: string | null;
  image?: string | null;
  url?: string | null;
  year?: number | null;
}

export interface TimelineEvent {
  id: string;
  label: string;
  date: string; // ISO date or year
  year: number;
  type?: string | null;
  url?: string | null;
}

export interface FactsResponse {
  code: string;
  wikidataId: string | null;
  summary: WikiSummary | null;
  inception: string | null;
  unesco: FactCard[];
  dishes: FactCard[];
  sports: FactCard[];
  people: FactCard[];
  events: TimelineEvent[];
  errors: string[];
}

export interface ChoroplethValue {
  value: number;
  year: number | null;
}

export interface ChoroplethResponse {
  gdpPerCapita: Record<string, ChoroplethValue>; // by cca3
  lifeExpectancy: Record<string, ChoroplethValue>;
  hdi: Record<string, ChoroplethValue>;
  fetchedAt: string;
}

export type ColorMode = "continent" | "population" | "gdp" | "hdi" | "life";
export type ViewMode = "2d" | "3d";
