import type { NewsCategory } from "@/types";

/**
 * Classificador de manchetes por categoria.
 * 1) Se o feed trouxer categoria própria, mapeia por nome.
 * 2) Senão, pontua palavras-chave (PT/EN) no título.
 * 3) Senão, usa a categoria padrão do veículo ou "sociedade".
 *
 * Isolado aqui para ser fácil de testar e ajustar.
 */

export interface CategoryMeta {
  id: NewsCategory;
  label: string;
  color: string; // cor base (hex) usada nos chips
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "politica", label: "Política", color: "#8b5cf6" },
  { id: "economia", label: "Economia/Mercado", color: "#f59e0b" },
  { id: "tecnologia", label: "Tecnologia", color: "#06b6d4" },
  { id: "cultura", label: "Cultura", color: "#ec4899" },
  { id: "esportes", label: "Esportes", color: "#22c55e" },
  { id: "ciencia", label: "Ciência/Saúde", color: "#3b82f6" },
  { id: "meio-ambiente", label: "Meio Ambiente", color: "#10b981" },
  { id: "conflitos", label: "Conflitos/Segurança", color: "#ef4444" },
  { id: "sociedade", label: "Sociedade", color: "#94a3b8" },
];

export const CATEGORY_BY_ID: Record<NewsCategory, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<NewsCategory, CategoryMeta>;

/** Mapeamento de categorias vindas dos feeds (minúsculas, sem acento). */
const FEED_CATEGORY_MAP: Array<[RegExp, NewsCategory]> = [
  [/esport|sport|futebol|football|soccer|olymp|olimp/, "esportes"],
  [/econom|mercado|market|business|negocio|financ|money|dinheiro|bolsa|invest/, "economia"],
  [/tecnolog|technolog|tech|digital|gadget|ciberseg|cyber/, "tecnologia"],
  [/cultura|culture|arte|art|music|cinema|film|entretenimento|entertainment|tv|celebr|livro|book/, "cultura"],
  [/cienc|scien|saude|health|medic|covid|vacina|vaccine|espaco|space/, "ciencia"],
  [/ambient|environment|clima|climate|natureza|nature|energia|energy|sustent/, "meio-ambiente"],
  [/guerra|war|conflit|conflict|defesa|defense|defence|militar|military|seguranca|security|terror|crime|policia|police/, "conflitos"],
  [/polit|politic|governo|government|eleic|election|congress|senado|parliament|diplom/, "politica"],
  [/mundo|world|internacional|international|sociedade|society|educa|cotidiano|cidades/, "sociedade"],
];

/** Palavras-chave por categoria. Avaliadas em texto normalizado (sem acento, minúsculas). */
const KEYWORDS: Record<NewsCategory, string[]> = {
  conflitos: [
    "guerra", "war", "ataque", "ataques", "atacou", "ataca", "attack", "bombardeio", "bombing", "bomba", "bomb", "missil", "missile", "drone", "exercito", "army",
    "tropas", "troops", "militar", "military", "soldado", "soldier", "cessar-fogo", "ceasefire", "conflito", "conflict",
    "invasao", "invasion", "terror", "atentado", "refem", "hostage", "explos", "tiroteio", "shooting", "homicid",
    "assassin", "crime", "policia", "police", "prisao", "arrested", "preso", "sequestr", "kidnap", "otan", "nato",
    "defesa", "defense", "defence", "nuclear", "armas", "weapons", "seguranca", "security", "cartel", "faccao", "gang",
    "ofensiva", "offensive", "frente", "front line", "mortos", "killed", "dead", "feridos", "injured", "massacre",
  ],
  politica: [
    "presidente", "president", "governo", "government", "ministro", "minister", "ministerio", "ministry", "eleicao",
    "eleicoes", "election", "voto", "vote", "parlamento", "parliament", "congresso", "congress", "senado", "senate",
    "camara", "deputado", "senador", "senator", "partido", "party", "oposicao", "opposition", "primeiro-ministro",
    "prime minister", "premier", "chanceler", "chancellor", "diplom", "embaixad", "embassy", "sancao", "sanction",
    "acordo", "treaty", "tratado", "onu", "united nations", "uniao europeia", "european union", "eu ", "cupula",
    "summit", "lei ", "law", "supremo", "supreme court", "stf", "impeachment", "reforma", "reform", "campanha",
    "campaign", "coalizao", "coalition", "referendo", "referendum", "constitui", "trump", "lula", "putin", "macron",
    "xi jinping", "zelensky", "netanyahu", "milei", "starmer", "modi", "erdogan", "biden", "kremlin", "casa branca",
    "white house", "planalto", "politic", "golpe", "coup", "protesto", "protest", "manifesta", "ditadura", "dictator",
  ],
  economia: [
    "economia", "economy", "economic", "pib", "gdp", "inflacao", "inflation", "juros", "interest rate", "selic", "fed ",
    "banco central", "central bank", "bolsa", "stock", "ibovespa", "wall street", "nasdaq", "dow jones", "dolar",
    "dollar", "euro", "real ", "cambio", "moeda", "currency", "mercado", "market", "investidor", "investor", "investimento",
    "investment", "empresa", "company", "companhia", "lucro", "profit", "prejuizo", "loss", "receita", "revenue",
    "balanco", "earnings", "acoes", "shares", "ipo", "fusao", "merger", "aquisicao", "acquisition", "tarifa", "tariff",
    "exporta", "export", "importa", "import", "comercio", "trade", "divida", "debt", "deficit", "orcamento", "budget",
    "imposto", "tax", "fiscal", "emprego", "jobs", "desemprego", "unemployment", "salario", "wage", "petroleo", "oil",
    "opep", "opec", "commodit", "soja", "minerio", "banco", "bank", "credito", "credit", "cripto", "crypto", "bitcoin",
    "fmi", "imf", "recessao", "recession", "crescimento", "growth", "consumo", "varejo", "retail", "industria", "industry",
    "agro", "safra", "harvest", "bilhoes", "billion", "milhoes", "million", "trilhoes", "trillion",
  ],
  tecnologia: [
    "tecnologia", "technology", "tech", "inteligencia artificial", "artificial intelligence", "ia ", " ai ", "chatgpt",
    "openai", "google", "apple", "microsoft", "meta ", "amazon", "nvidia", "tesla", "spacex", "starlink", "samsung",
    "huawei", "tiktok", "instagram", "whatsapp", "facebook", "twitter", "iphone", "android", "smartphone", "celular",
    "app ", "aplicativo", "software", "hardware", "chip", "semicondutor", "semiconductor", "robo", "robot", "cibersegur",
    "cyber", "hacker", "ataque hacker", "vazamento", "data leak", "internet", "5g", "6g", "startup", "algoritmo",
    "algorithm", "rede social", "social media", "streaming", "games", "videogame", "playstation", "xbox", "nintendo",
    "satelite", "satellite", "computacao", "computing", "quantum", "quantico", "drone", "eletrico", "electric vehicle",
  ],
  cultura: [
    "cultura", "culture", "filme", "film", "movie", "cinema", "serie", "series", "netflix", "oscar", "festival", "musica",
    "music", "show", "concerto", "concert", "turne", "tour", "album", "cantor", "cantora", "singer", "banda", "band",
    "ator", "atriz", "actor", "actress", "teatro", "theatre", "theater", "livro", "book", "escritor", "writer", "autor",
    "author", "literatura", "literature", "museu", "museum", "exposicao", "exhibition", "arte", "art ", "artista",
    "artist", "moda", "fashion", "carnaval", "carnival", "novela", "celebridade", "celebrity", "premio", "award",
    "grammy", "emmy", "cannes", "bienal", "patrimonio", "heritage", "gastronomia", "cuisine", "chef", "religi",
    "papa ", "pope", "vaticano", "vatican", "igreja", "church", "turismo", "tourism", "viagem", "travel",
  ],
  esportes: [
    "futebol", "football", "soccer", "copa", "cup", "campeonato", "championship", "liga", "league", "gol ", "goal",
    "jogador", "player", "tecnico", "coach", "selecao", "national team", "fifa", "uefa", "conmebol", "libertadores",
    "champions", "premier league", "la liga", "brasileirao", "flamengo", "palmeiras", "corinthians", "real madrid",
    "barcelona", "olimpiada", "olympic", "olympics", "medalha", "medal", "atleta", "athlete", "tenis", "tennis",
    "basquete", "basketball", "nba", "nfl", "volei", "volleyball", "formula 1", "f1", "verstappen", "hamilton",
    "corrida", "race", "maratona", "marathon", "natacao", "swimming", "boxe", "boxing", "ufc", "mma", "golfe", "golf",
    "surf", "skate", "ciclismo", "cycling", "tour de france", "esporte", "sport", "treinador", "manager", "transfer",
    "contratacao", "estadio", "stadium", "torcida", "fans", "neymar", "messi", "ronaldo", "vinicius", "onde assistir",
    "ao vivo", "escalacao", "escalacoes", "rodada", "placar", "amistoso", "eliminatorias", "classificacao", "titulo",
    "seleção", "ge ", "espn", "lance", "sportv",
  ],
  ciencia: [
    "ciencia", "science", "cientista", "scientist", "pesquisa", "research", "estudo", "study", "saude", "health",
    "hospital", "medic", "doctor", "doenca", "disease", "virus", "vacina", "vaccine", "epidemia", "pandemia", "pandemic",
    "surto", "outbreak", "covid", "gripe", "flu", "dengue", "cancer", "oms", "who ", "anvisa", "fda", "remedio", "drug",
    "medicamento", "tratamento", "treatment", "cirurgia", "surgery", "nasa", "espaco", "space", "foguete", "rocket",
    "lua", "moon", "marte", "mars", "planeta", "planet", "telescopio", "telescope", "asteroide", "asteroid", "eclipse",
    "fisica", "physics", "quimica", "chemistry", "biologia", "biology", "genetic", "dna", "fossil", "dinossauro",
    "dinosaur", "arqueolog", "archaeolog", "descoberta", "discovery", "universidade", "university", "nobel", "mental",
    "obesidade", "obesity", "sus ", "medicina", "medicine", "cerebro", "brain",
  ],
  "meio-ambiente": [
    "clima", "climate", "aquecimento global", "global warming", "mudanca climatica", "climate change", "cop30", "cop29",
    "cop ", "carbono", "carbon", "emissoes", "emissions", "desmatamento", "deforestation", "amazonia", "amazon rainforest",
    "floresta", "forest", "queimada", "wildfire", "incendio", "fire", "enchente", "flood", "inundacao", "seca", "drought",
    "furacao", "hurricane", "tufao", "typhoon", "ciclone", "cyclone", "tempestade", "storm", "terremoto", "earthquake",
    "tsunami", "vulcao", "volcano", "erupcao", "eruption", "onda de calor", "heatwave", "temperatura", "temperature",
    "meio ambiente", "environment", "ambiental", "poluicao", "pollution", "plastico", "plastic", "oceano", "ocean",
    "biodiversidade", "biodiversity", "especie", "species", "animal", "animais", "wildlife", "energia renovavel",
    "renewable", "solar", "eolica", "wind power", "ibama", "chuva", "rain", "neve", "snow", "frio", "cold", "calor", "heat",
    "deslizamento", "landslide", "agua", "water", "lixo", "waste", "reciclagem", "recycling",
  ],
  sociedade: [
    "sociedade", "society", "educacao", "education", "escola", "school", "professor", "teacher", "aluno", "student",
    "enem", "universidade", "universidad", "familia", "family", "mulher", "women", "crianca", "child", "children",
    "jovem", "youth", "idoso", "elderly", "imigra", "immigra", "migra", "refugiado", "refugee", "fronteira", "border",
    "direitos humanos", "human rights", "racismo", "racism", "lgbt", "genero", "gender", "igualdade", "equality",
    "transito", "traffic", "acidente", "accident", "transporte", "transport", "metro", "onibus", "bus", "aviao", "plane",
    "voo", "flight", "aeroporto", "airport", "greve", "strike", "sindicato", "union", "moradia", "housing", "habitacao",
    "pobreza", "poverty", "fome", "hunger", "desigualdade", "inequality", "censo", "census", "populacao", "population",
    "cidade", "city", "prefeitura", "prefeito", "mayor", "comunidade", "community", "trabalho", "work", "loteria",
    "lottery", "mega-sena", "feriado", "holiday", "natal", "christmas", "trem", "train", "rodovia", "highway",
  ],
};

/** Ordem de desempate quando duas categorias pontuam igual. */
const PRIORITY: NewsCategory[] = [
  "conflitos",
  "esportes",
  "economia",
  "tecnologia",
  "ciencia",
  "meio-ambiente",
  "cultura",
  "politica",
  "sociedade",
];

export function normalizeText(s: string): string {
  return ` ${s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export function categoryFromFeed(feedCategories: string[] | undefined): NewsCategory | null {
  if (!feedCategories?.length) return null;
  for (const raw of feedCategories) {
    const c = normalizeText(raw);
    for (const [re, cat] of FEED_CATEGORY_MAP) {
      if (re.test(c)) return cat;
    }
  }
  return null;
}

export function categoryFromTitle(title: string): NewsCategory | null {
  const text = normalizeText(title);
  const scores = new Map<NewsCategory, number>();
  for (const cat of PRIORITY) {
    let score = 0;
    for (const kw of KEYWORDS[cat]) {
      // sempre casa no início de palavra ("ia " não pode casar "ucrânia ")
      const needle = kw.startsWith(" ") ? kw : ` ${kw}`;
      if (text.includes(needle)) {
        // termos mais longos/específicos valem mais
        score += kw.length >= 8 ? 2 : 1;
      }
    }
    if (score > 0) scores.set(cat, score);
  }
  if (!scores.size) return null;
  let best: NewsCategory | null = null;
  let bestScore = -1;
  for (const cat of PRIORITY) {
    const s = scores.get(cat) ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  return best;
}

export function classifyNews(
  title: string,
  feedCategories?: string[],
  fallback: NewsCategory = "sociedade",
): NewsCategory {
  return categoryFromFeed(feedCategories) ?? categoryFromTitle(title) ?? fallback;
}
