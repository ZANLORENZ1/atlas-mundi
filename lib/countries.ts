import rawCountries from "world-countries";
import { getCountry as getTzCountry, getTimezone } from "countries-and-timezones";
import { cached, TTL } from "@/lib/cache";
import { getIndicatorForAll } from "@/lib/worldBank";
import type { CountryDetail, CountrySummary } from "@/types";

/**
 * Dados básicos dos países.
 *
 * Fonte: dataset aberto `world-countries` (mledoze/countries, ODbL), a mesma
 * base que alimentava o REST Countries v3.1 — que foi desligado em 2026 e hoje
 * exige chave de API. Complementos: bandeiras via flagcdn.com, população via
 * Banco Mundial (SP.POP.TOTL) e fusos via `countries-and-timezones`.
 */

interface RawCountry {
  name: { common: string; official: string };
  tld?: string[];
  cca2: string;
  ccn3?: string;
  cca3: string;
  independent?: boolean | null;
  unMember?: boolean;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  idd?: { root?: string; suffixes?: string[] };
  capital?: string[];
  region?: string;
  subregion?: string;
  languages?: Record<string, string>;
  translations?: Record<string, { official?: string; common?: string }>;
  latlng?: number[];
  landlocked?: boolean;
  borders?: string[];
  area?: number;
  flag?: string;
  demonyms?: Record<string, { f?: string; m?: string }>;
}

const DATA = rawCountries as unknown as RawCountry[];

const REGION_PT: Record<string, string> = {
  Africa: "África",
  Americas: "Américas",
  Asia: "Ásia",
  Europe: "Europa",
  Oceania: "Oceania",
  Antarctic: "Antártida",
};

const SUBREGION_PT: Record<string, string> = {
  "South America": "América do Sul",
  "Central America": "América Central",
  "North America": "América do Norte",
  Caribbean: "Caribe",
  "Northern Europe": "Europa Setentrional",
  "Southern Europe": "Europa Meridional",
  "Western Europe": "Europa Ocidental",
  "Eastern Europe": "Europa Oriental",
  "Central Europe": "Europa Central",
  "Southeast Europe": "Sudeste Europeu",
  "Northern Africa": "África Setentrional",
  "Western Africa": "África Ocidental",
  "Eastern Africa": "África Oriental",
  "Middle Africa": "África Central",
  "Southern Africa": "África Austral",
  "Western Asia": "Ásia Ocidental",
  "Central Asia": "Ásia Central",
  "Eastern Asia": "Ásia Oriental",
  "Southern Asia": "Ásia Meridional",
  "South-Eastern Asia": "Sudeste Asiático",
  "Australia and New Zealand": "Austrália e Nova Zelândia",
  Melanesia: "Melanésia",
  Micronesia: "Micronésia",
  Polynesia: "Polinésia",
};

const LANGUAGE_PT: Record<string, string> = {
  Portuguese: "Português",
  English: "Inglês",
  Spanish: "Espanhol",
  French: "Francês",
  German: "Alemão",
  Italian: "Italiano",
  Japanese: "Japonês",
  Chinese: "Chinês",
  Arabic: "Árabe",
  Russian: "Russo",
  Hindi: "Híndi",
  Dutch: "Neerlandês",
  Swedish: "Sueco",
  Norwegian: "Norueguês",
  Danish: "Dinamarquês",
  Finnish: "Finlandês",
  Icelandic: "Islandês",
  Polish: "Polonês",
  Turkish: "Turco",
  Korean: "Coreano",
  Greek: "Grego",
  Hebrew: "Hebraico",
  Persian: "Persa",
  Urdu: "Urdu",
  Bengali: "Bengali",
  Albanian: "Albanês",
  Serbian: "Sérvio",
  Ukrainian: "Ucraniano",
  Romanian: "Romeno",
  Hungarian: "Húngaro",
  Czech: "Tcheco",
  Slovak: "Eslovaco",
  Croatian: "Croata",
  Bulgarian: "Búlgaro",
  Thai: "Tailandês",
  Vietnamese: "Vietnamita",
  Indonesian: "Indonésio",
  Malay: "Malaio",
  Swahili: "Suaíli",
  Amharic: "Amárico",
  Afrikaans: "Africâner",
  Irish: "Irlandês",
  Latin: "Latim",
  Catalan: "Catalão",
  Basque: "Basco",
  Galician: "Galego",
  Guaraní: "Guarani",
  Quechua: "Quíchua",
  Aymara: "Aimará",
  "Haitian Creole": "Crioulo haitiano",
  Filipino: "Filipino",
  Burmese: "Birmanês",
  Khmer: "Khmer",
  Lao: "Laociano",
  Mongolian: "Mongol",
  Nepali: "Nepalês",
  Sinhala: "Cingalês",
  Tamil: "Tâmil",
  Somali: "Somali",
  Kazakh: "Cazaque",
  Uzbek: "Uzbeque",
  Armenian: "Armênio",
  Georgian: "Georgiano",
  Azerbaijani: "Azerbaijano",
  Lithuanian: "Lituano",
  Latvian: "Letão",
  Estonian: "Estoniano",
  Slovene: "Esloveno",
  Macedonian: "Macedônio",
  Bosnian: "Bósnio",
  Montenegrin: "Montenegrino",
  Maltese: "Maltês",
  Luxembourgish: "Luxemburguês",
  Belarusian: "Bielorrusso",
  Tibetan: "Tibetano",
  Dzongkha: "Dzongkha",
  Maori: "Maori",
  Samoan: "Samoano",
  Tongan: "Tonganês",
  Fijian: "Fijiano",
  Berber: "Berbere",
  Kurdish: "Curdo",
  Pashto: "Pachto",
  Dari: "Dari",
  Tajik: "Tadjique",
  Kyrgyz: "Quirguiz",
  Turkmen: "Turcomeno",
  Sotho: "Soto",
  Tswana: "Tsuana",
  Zulu: "Zulu",
  Xhosa: "Xhosa",
  Shona: "Shona",
  Kinyarwanda: "Kinyarwanda",
  Kirundi: "Kirundi",
  Lingala: "Lingala",
  Wolof: "Uolofe",
  Hausa: "Hauçá",
  Yoruba: "Iorubá",
  Igbo: "Igbo",
  Tigrinya: "Tigrínia",
  Malagasy: "Malgaxe",
  Chewa: "Chewa",
  Sango: "Sango",
  Mandarin: "Mandarim",
  Cantonese: "Cantonês",
  "Northern Sotho": "Soto do Norte",
  "Swazi": "Suázi",
  "Southern Ndebele": "Ndebele do Sul",
  Venda: "Venda",
  Tsonga: "Tsonga",
  "Papiamento": "Papiamento",
  Faroese: "Feroês",
  Greenlandic: "Groenlandês",
};

const CURRENCY_PT: Record<string, string> = {
  BRL: "Real brasileiro",
  USD: "Dólar americano",
  EUR: "Euro",
  JPY: "Iene japonês",
  GBP: "Libra esterlina",
  CNY: "Yuan chinês",
  INR: "Rúpia indiana",
  ARS: "Peso argentino",
  MXN: "Peso mexicano",
  CAD: "Dólar canadense",
  AUD: "Dólar australiano",
  CHF: "Franco suíço",
  RUB: "Rublo russo",
  KRW: "Won sul-coreano",
  ISK: "Coroa islandesa",
  SEK: "Coroa sueca",
  NOK: "Coroa norueguesa",
  DKK: "Coroa dinamarquesa",
  PLN: "Zloty polonês",
  TRY: "Lira turca",
  ZAR: "Rand sul-africano",
  CLP: "Peso chileno",
  COP: "Peso colombiano",
  PEN: "Sol peruano",
  UYU: "Peso uruguaio",
  PYG: "Guarani paraguaio",
  BOB: "Boliviano",
  VES: "Bolívar venezuelano",
  EGP: "Libra egípcia",
  SAR: "Rial saudita",
  AED: "Dirham dos Emirados",
  ILS: "Novo shekel israelense",
  NZD: "Dólar neozelandês",
  SGD: "Dólar de Singapura",
  HKD: "Dólar de Hong Kong",
  TWD: "Novo dólar taiwanês",
  THB: "Baht tailandês",
  IDR: "Rupia indonésia",
  VND: "Dong vietnamita",
  PHP: "Peso filipino",
  NGN: "Naira nigeriana",
  KES: "Xelim queniano",
  MAD: "Dirham marroquino",
  CZK: "Coroa tcheca",
  HUF: "Florim húngaro",
  RON: "Leu romeno",
  UAH: "Hryvnia ucraniana",
  PKR: "Rúpia paquistanesa",
  BDT: "Taka de Bangladesh",
  IRR: "Rial iraniano",
  XOF: "Franco CFA (BCEAO)",
  XAF: "Franco CFA (BEAC)",
  XCD: "Dólar do Caribe Oriental",
  CUP: "Peso cubano",
};

/** Países e territórios com mão inglesa (direção à esquerda). */
const LEFT_DRIVING = new Set([
  "AG", "AU", "BS", "BD", "BB", "BM", "BT", "BW", "BN", "KY", "CK", "CY", "DM", "FK", "FJ", "GD", "GG", "GY", "HK",
  "IN", "ID", "IE", "IM", "JM", "JP", "JE", "KE", "KI", "LS", "MO", "MW", "MY", "MV", "MT", "MU", "MS", "MZ", "NA",
  "NR", "NP", "NZ", "NU", "NF", "PK", "PG", "PN", "KN", "LC", "VC", "WS", "SC", "SG", "SB", "ZA", "SS", "LK", "SR",
  "SZ", "TZ", "TH", "TL", "TK", "TO", "TT", "TC", "TV", "UG", "GB", "VG", "VI", "ZM", "ZW", "AI", "SH", "GS", "IO",
  "CC", "CX", "TF", "JP",
]);

export function flagUrls(cca2: string): { svg: string; png: string } {
  const c = cca2.toLowerCase();
  return { svg: `https://flagcdn.com/${c}.svg`, png: `https://flagcdn.com/w320/${c}.png` };
}

/** Territórios sem entrada no pacote de fusos. */
const TZ_FALLBACK: Record<string, string[]> = { XK: ["Europe/Belgrade"] };

/**
 * Fusos do país. Prefere o nome "local" quando o IANA canônico é de outro país
 * (ex.: Islândia → Atlantic/Reykjavik em vez de Africa/Abidjan).
 */
function timezonesFor(cca2: string): { zones: string[]; summary: string | null } {
  const country = getTzCountry(cca2, { deprecated: true });
  let zones: string[] = country?.timezones ?? TZ_FALLBACK[cca2] ?? [];
  const canonical = zones.filter((z) => !getTimezone(z)?.aliasOf);
  zones = (canonical.length ? canonical : zones).map((z) => {
    const tz = getTimezone(z);
    if (tz && tz.countries.length > 1) {
      const local = (country?.timezones ?? []).find((a) => {
        const t = getTimezone(a);
        return (
          t?.aliasOf === z &&
          /^(Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific)\//.test(a) &&
          t.countries.length === 1
        );
      });
      if (local) return local;
    }
    return z;
  });
  const offsets = Array.from(
    new Set(zones.map((z) => getTimezone(z)?.utcOffset).filter((o): o is number => typeof o === "number")),
  ).sort((a, b) => a - b);
  const fmt = (min: number) => {
    const sign = min < 0 ? "−" : "+";
    const abs = Math.abs(min);
    return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  };
  const summary = !offsets.length
    ? null
    : offsets.length === 1
      ? fmt(offsets[0])
      : `${fmt(offsets[0])} a ${fmt(offsets[offsets.length - 1])}`;
  return { zones, summary };
}

function translatePt(label: string, dict: Record<string, string>): string {
  return dict[label] ?? label;
}

function toSummary(r: RawCountry, population: number): CountrySummary {
  const pt = r.translations?.por;
  const flags = flagUrls(r.cca2);
  return {
    cca2: r.cca2,
    cca3: r.cca3,
    ccn3: r.ccn3 && r.ccn3.length ? r.ccn3 : null,
    name: pt?.common ?? r.name.common,
    nameEn: r.name.common,
    flagEmoji: r.flag ?? "",
    flagSvg: flags.svg,
    flagPng: flags.png,
    region: REGION_PT[r.region ?? ""] ?? r.region ?? "",
    subregion: SUBREGION_PT[r.subregion ?? ""] ?? r.subregion ?? "",
    population,
    area: r.area ?? 0,
  };
}

function toDetail(r: RawCountry, population: number): CountryDetail {
  const base = toSummary(r, population);
  const pt = r.translations?.por;
  const callingCode =
    r.idd?.root && r.idd.suffixes?.length
      ? r.idd.suffixes.length === 1
        ? `${r.idd.root}${r.idd.suffixes[0]}`
        : r.idd.root
      : (r.idd?.root ?? null);
  const tz = timezonesFor(r.cca2);
  return {
    ...base,
    officialName: r.name.official,
    officialNamePt: pt?.official ?? r.name.official,
    capital: r.capital ?? [],
    languages: Object.values(r.languages ?? {}).map((l) => translatePt(l, LANGUAGE_PT)),
    currencies: Object.entries(r.currencies ?? {}).map(([code, c]) => ({
      code,
      name: CURRENCY_PT[code] ?? c.name ?? code,
      symbol: c.symbol ?? "",
    })),
    timezones: tz.zones,
    utcOffsets: tz.summary,
    callingCode,
    tld: r.tld ?? [],
    drivingSide: LEFT_DRIVING.has(r.cca2) ? "left" : "right",
    borders: r.borders ?? [],
    latlng: r.latlng && r.latlng.length >= 2 ? [r.latlng[0], r.latlng[1]] : null,
    landlocked: r.landlocked ?? false,
    unMember: r.unMember ?? false,
    independent: r.independent ?? null,
    googleMaps: `https://www.google.com/maps/place/${encodeURIComponent(r.name.common)}`,
    coatOfArms: null,
    demonymPt: r.demonyms?.eng?.m ?? null,
    continents: [],
    startOfWeek: null,
  };
}

/** População mais recente de todos os países (Banco Mundial), tolerante a falha. */
async function getPopulations(): Promise<Record<string, number>> {
  return cached("pop:all", TTL.COUNTRY, async () => {
    try {
      const rows = await getIndicatorForAll("SP.POP.TOTL");
      const out: Record<string, number> = {};
      for (const [iso3, v] of Object.entries(rows)) out[iso3] = v.value;
      return out;
    } catch (err) {
      console.warn("[countries] população indisponível:", err instanceof Error ? err.message : err);
      return {};
    }
  });
}

/** Lista de todos os países (24 h). */
export function getAllCountries(): Promise<CountrySummary[]> {
  return cached("countries:all", TTL.COUNTRY, async () => {
    const pop = await getPopulations();
    const list = DATA.map((r) => toSummary(r, pop[r.cca3] ?? 0));
    list.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    return list;
  });
}

/** Detalhe sem dados externos (síncrono, serve para metadados pré-renderizados). */
export function getCountryStatic(code: string): CountryDetail | null {
  const key = code.toUpperCase();
  const raw = DATA.find((r) => r.cca2 === key || r.cca3 === key);
  return raw ? toDetail(raw, 0) : null;
}

/** Detalhe de um país por alpha-2 ou alpha-3. */
export async function getCountry(code: string): Promise<CountryDetail | null> {
  const key = code.toUpperCase();
  const raw = DATA.find((r) => r.cca2 === key || r.cca3 === key);
  if (!raw) return null;
  const pop = await getPopulations();
  return toDetail(raw, pop[raw.cca3] ?? 0);
}

export function findRaw(code: string): { cca2: string; cca3: string; namePt: string; nameEn: string; demonyms: string[] } | null {
  const key = code.toUpperCase();
  const r = DATA.find((x) => x.cca2 === key || x.cca3 === key);
  if (!r) return null;
  const demonyms = [r.demonyms?.eng?.m, r.demonyms?.eng?.f].filter((d): d is string => !!d);
  return {
    cca2: r.cca2,
    cca3: r.cca3,
    namePt: r.translations?.por?.common ?? r.name.common,
    nameEn: r.name.common,
    demonyms,
  };
}
