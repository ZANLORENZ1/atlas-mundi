# Atlas Mundi

Mapa-múndi interativo para quem gosta de geopolítica, história, atualidades e economia. Clique em um país para abrir um painel com dados, curiosidades e as manchetes mais recentes organizadas por categoria.

- **Mapa 2D** (d3-geo + TopoJSON do world-atlas) e **Globo 3D** (react-globe.gl), com zoom animado até o país.
- **Choropleth** por continente, população, PIB per capita, IDH e expectativa de vida.
- **Painel** com três abas: Dados (indicadores, gráficos, vizinhos), Curiosidades (Wikipédia + Wikidata) e Notícias (somente manchete + link).
- Busca com autocomplete, país aleatório, favoritos (localStorage), comparação lado a lado, URL compartilhável `/pais/BR` com Open Graph.
- Modo escuro (padrão) e claro. Interface em português do Brasil. Responsivo: no celular o painel vira bottom sheet arrastável.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Não é preciso nenhuma chave de API.

Outros comandos: `npm run build`, `npm start`, `npm run typecheck`, `npm run lint`.

### Rede corporativa com inspeção TLS

Se o servidor registrar erros como `certificate signature failure` ao buscar dados externos, exporte a cadeia de certificados do proxy para um arquivo PEM e aponte `NODE_EXTRA_CA_CERTS` em `.env.local` (veja `.env.example`). O script `scripts/dev.mjs` lê esse arquivo antes de iniciar o Next, pois a variável precisa existir antes de o Node subir.

## Estrutura

```
app/                 páginas (App Router) e rotas de API (app/api/*)
  pais/[code]/       URL compartilhável com metadados Open Graph
components/          AtlasApp (tela), map/ (2D, 3D, legenda), panel/ (abas), ui/
config/news-sources.ts  veículos com RSS direto
lib/                 clients das APIs, cache, classificador, formatação
store/               estado global (zustand + persist)
types/               tipos compartilhados
public/data/         TopoJSON do mundo
```

### Rotas de API (server-side, com cache em memória)

| Rota | Fonte | Cache |
| --- | --- | --- |
| `GET /api/countries` | world-countries + Banco Mundial (população) | 24 h |
| `GET /api/country/:code` | world-countries, countries-and-timezones, flagcdn | 24 h |
| `GET /api/country/:code/indicators` | Banco Mundial (api.worldbank.org/v2) + IDH via Wikidata | 24 h |
| `GET /api/country/:code/facts` | Wikipédia (REST, pt → en) + Wikidata (SPARQL) | 24 h |
| `GET /api/country/:code/news` | Google News RSS (PT/EN) + RSS dos veículos | 30 min |
| `GET /api/news/world` | Google News RSS (manchetes gerais) | 30 min |
| `GET /api/choropleth` | Banco Mundial + Wikidata | 24 h |

Todas as respostas externas são validadas com Zod, têm timeout e falham isoladamente: uma fonte fora do ar não quebra o restante do painel. Países sem dados (Taiwan, territórios) mostram "dados indisponíveis".

Resiliência:

- O cache em memória usa *stale-if-error*: se uma fonte falhar depois de já ter respondido uma vez, o último dado bom continua sendo servido.
- O Banco Mundial estrangula requisições paralelas; o client limita a concorrência a 2, com timeout de 25 s e uma nova tentativa.
- Quando o Banco Mundial não responde, o painel mostra o que tem (população e área do dataset local) e um botão "Tentar de novo". Esse caso é diferente de "não publica dados", que aparece para territórios sem séries.
- O cache vive no processo do servidor: reiniciar o `npm run dev` o esvazia.

## Fontes de dados

- **Dados gerais dos países:** dataset aberto [world-countries](https://github.com/mledoze/countries) (ODbL). É a mesma base que alimentava o REST Countries v3.1, que foi desligado em 2026 e passou a exigir chave de API.
- **Bandeiras:** [flagcdn.com](https://flagcdn.com).
- **Indicadores econômicos e sociais:** [Banco Mundial](https://api.worldbank.org/v2).
- **IDH, patrimônios da UNESCO, pratos, esportes, personalidades e eventos:** [Wikidata](https://query.wikidata.org) (CC0).
- **Resumo e imagem:** [Wikipédia](https://pt.wikipedia.org) (CC BY-SA).
- **Notícias:** RSS do Google Notícias e RSS oficiais dos veículos. Guardamos apenas título, link, veículo e data. Nenhum conteúdo de página é baixado.

## Como adicionar um veículo de notícias

Edite `config/news-sources.ts` e acrescente um objeto:

```ts
{
  id: "meu-veiculo",
  name: "Meu Veículo",
  url: "https://exemplo.com/rss.xml",
  domain: "exemplo.com",        // usado para o favicon
  language: "pt",               // "pt" | "en"
  scope: "nacional",            // "nacional" | "internacional"
  defaultCategory: "economia",  // opcional: categoria quando o título não permite classificar
}
```

Os feeds diretos são baixados uma vez a cada 30 minutos e filtrados pelo nome do país (português, inglês e apelidos em `lib/isoMap.ts`, `NEWS_ALIASES`). A classificação por categoria fica em `lib/classifyNews.ts`: primeiro pela categoria do feed, depois por palavras-chave PT/EN no título.

## Variáveis de ambiente

Todas opcionais; veja `.env.example`.
