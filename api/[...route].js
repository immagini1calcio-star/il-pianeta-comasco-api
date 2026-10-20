
const BASE = "https://www.sofascore.com/api/v1";
const VERSION = "6.0.0";
const CACHE_MS = 60000;
const cache = new Map();

const TEAMS = {
  como: {
    name: "Como",
    searches: ["Como 1907", "Como"],
    aliases: ["como", "como 1907"]
  },
  primavera: {
    name: "Como Primavera",
    searches: ["Como U19", "Como Primavera", "Como Under 19", "Como Under 20", "Como U20"],
    aliases: ["como primavera", "como u19", "como under 19"]
  },
  women: {
    name: "Como Women",
    searches: ["Como Women", "Como femminile"],
    aliases: ["como women", "como femminile", "como", "como women 1907"]
  }
};

// Le notizie sono cercate separatamente dai dati sportivi.
const NEWS_SOURCES = [
  {
    name: "Google News - Como",
    query: '"Como 1907" calcio'
  },
  {
    name: "OneFootball",
    query: 'site:onefootball.com Como calcio'
  },
  {
    name: "Sky Sport",
    query: 'site:sport.sky.it Como calcio'
  },
  {
    name: "Gazzetta dello Sport",
    query: 'site:gazzetta.it Como calcio'
  },
  {
    name: "Tuttomercatoweb",
    query: 'site:tuttomercatoweb.com Como'
  },
  {
    name: "Fabrizio Romano",
    query: '(site:fabrizioromano.com OR "Fabrizio Romano") Como calcio'
  },
  {
    name: "Como Primavera",
    query: '"Como Primavera" calcio'
  },
  {
    name: "Como Women",
    query: '"Como Women" calcio OR "Como femminile"'
  }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "GET") {
    return send(res, 405, { error: "Usa una richiesta GET." });
  }

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const route = (url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "") || "health").toLowerCase();
  const q = url.searchParams;
  const team = getTeam(q.get("team") || q.get("squadra") || route.split("/")[0]);
  const limit = integer(q.get("limit"), 50, 1, 100);
  const id = q.get("id") || q.get("eventId");

  try {
    let data;

    if (route === "health") {
      data = {
        ok: true,
        service: "Il Pianeta Comasco API",
        version: VERSION,
        sportsData: "Sofascore",
        newsData: NEWS_SOURCES.map(s => s.name),
        endpoints: endpoints()
      };
    } else if (route === "configurazione" || route === "config") {
      data = {
        teams: TEAMS,
        sportsSource: "Sofascore",
        newsSources: NEWS_SOURCES,
        warning: "Gli endpoint sportivi Sofascore non sono un'API pubblica ufficiale garantita."
      };
    } else if (route === "squadre") {
      data = await discoverTeams();
    } else if (route === "notizie" || route === "news" || route.endsWith("/notizie")) {
      data = await getNews(q.get("team") || "Como", limit);
    } else if (route === "tutto") {
      data = { generatedAt: new Date().toISOString(), teams: {} };
      for (const t of Object.keys(TEAMS)) {
        data.teams[t] = await safe(() => summary(t, limit));
      }
      data.news = await safe(() => getNews("Como", limit));
    } else if (["partita", "evento", "match"].includes(route)) {
      if (!id) throw Error("Inserisci ?id=ID_PARTITA_SOFASCORE");
      data = await eventDetails(id);
    } else if (["formazioni", "lineups"].includes(route)) {
      if (!id) throw Error("Inserisci ?id=ID_PARTITA_SOFASCORE");
      data = await eventPart(id, "lineups");
    } else if (["statistiche-partita", "match-statistics"].includes(route)) {
      if (!id) throw Error("Inserisci ?id=ID_PARTITA_SOFASCORE");
      data = await eventPart(id, "statistics");
    } else if (["incidenti", "incidents"].includes(route)) {
      if (!id) throw Error("Inserisci ?id=ID_PARTITA_SOFASCORE");
      data = await eventPart(id, "incidents");
    } else if (["scontri-diretti", "h2h"].includes(route)) {
      if (!id) throw Error("Inserisci ?id=ID_PARTITA_SOFASCORE");
      data = await eventPart(id, "h2h");
    } else {
      const key = getTeam(q.get("team") || q.get("squadra") || route.split("/")[0]);
      if (!key) throw Error("Squadra non riconosciuta. Usa team=como, team=primavera o team=women.");

      const sub = route.split("/").pop();

      if (["partite", "calendario", "matches", "fixtures"].includes(sub)) {
        data = await getMatches(key, q.get("direction") || "all", limit, integer(q.get("pages"), 5, 1, 20));
      } else if (["rosa", "giocatori", "players", "roster"].includes(sub)) {
        data = await getRoster(key);
      } else if (["indisponibili", "infortuni", "absences"].includes(sub)) {
        data = await getAbsences(key);
      } else if (["statistiche", "stats"].includes(sub)) {
        data = await getStats(key);
      } else if (["classifica", "standings"].includes(sub)) {
        data = await getStandings(key);
      } else if (["competizioni", "competizioni-squadra"].includes(sub)) {
        data = await getCompetitions(key);
      } else if (["riepilogo", "summary"].includes(sub)) {
        data = await summary(key, limit);
      } else {
        throw Error("Endpoint non riconosciuto. Apri /api/health per la lista.");
      }
    }

    return send(res, 200, data);
  } catch (e) {
    return send(res, 502, {
      ok: false,
      endpoint: route,
      team: team || null,
      error: String(e.message || e),
      source: "Sofascore / fonti RSS",
      note: "Una fonte può essere temporaneamente non disponibile o non pubblicare questi dati."
    });
  }
}

function endpoints() {
  return [
    "/api/health",
    "/api/configurazione",
    "/api/squadre",
    "/api/partite?team=como",
    "/api/partite?team=primavera",
    "/api/partite?team=women",
    "/api/partite?team=como&direction=last",
    "/api/partite?team=como&direction=next",
    "/api/rosa?team=como",
    "/api/indisponibili?team=como",
    "/api/statistiche?team=como",
    "/api/classifica?team=como",
    "/api/competizioni?team=como",
    "/api/como/riepilogo",
    "/api/primavera/riepilogo",
    "/api/women/riepilogo",
    "/api/notizie?team=Como",
    "/api/notizie?team=Primavera",
    "/api/notizie?team=Women",
    "/api/partita?id=ID_SOFASCORE",
    "/api/formazioni?id=ID_SOFASCORE",
    "/api/statistiche-partita?id=ID_SOFASCORE",
    "/api/incidenti?id=ID_SOFASCORE",
    "/api/scontri-diretti?id=ID_SOFASCORE",
    "/api/tutto"
  ];
}

function send(res, status, value) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value, null, 2));
}

function integer(value, fallback, min, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min ? Math.min(n, max) : fallback;
}

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTeam(value) {
  const s = norm(value);
  if (!s) return null;
  if (s === "como" || s.includes("como 1907") || s === "como prima squadra") return "como";
  if (s.includes("primavera") || s.includes("u19") || s.includes("under 19")) return "primavera";
  if (s.includes("women") || s.includes("femmin") || s.includes("donne")) return "women";
  return null;
}

async function fetchJSON(path) {
  const url = BASE + path;
  const old = cache.get(url);
  if (old && Date.now() - old.time < CACHE_MS) return old.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, */*",
        "Referer": "https://www.sofascore.com/"
      }
    });
    if (!response.ok) throw Error(`Sofascore HTTP ${response.status}: ${path}`);
    const json = await response.json();
    cache.set(url, { time: Date.now(), data: json });
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml, application/xml, text/xml, */*" }
  });
  if (!response.ok) throw Error(`RSS HTTP ${response.status}`);
  return response.text();
}

async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

async function searchTeam(query) {
  const d = await fetchJSON(`/search/all?q=${encodeURIComponent(query)}`);
  return [
    ...(d.teams || []),
    ...(d.results || []).filter(x => x.type === "team").map(x => x.entity || x),
    ...(d.suggestions || []).filter(x => x.type === "team").map(x => x.entity || x)
  ];
}

function scoreCandidate(candidate, key) {
  const name = norm(candidate.name || candidate.team?.name);
  if (!name.includes("como")) return -100;
  let score = 5;
  if (key === "como") {
    if (name === "como" || name === "como 1907") score += 15;
    if (/women|femmin|u19|under 19|primavera/.test(name)) score -= 20;
  }
  if (key === "primavera") {
    if (/u19|under 19|primavera|youth/.test(name)) score += 15;
    if (/women|femmin/.test(name)) score -= 20;
    if (name === "como" || name === "como 1907") score -= 15;
  }
  if (key === "women") {
    if (/women|femmin|ladies/.test(name)) score += 15;
    if (/u19|under 19|primavera/.test(name)) score -= 20;
    if (name === "como" || name === "como 1907") score -= 15;
  }
  return score;
}

async function findTeam(key) {
  const config = TEAMS[key];
  const all = [];
  const errors = [];

  for (const query of config.searches) {
    try {
      all.push(...await searchTeam(query));
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }

  const unique = new Map();
  for (const x of all) if (x.id != null) unique.set(String(x.id), x);

  const ranked = [...unique.values()]
    .map(x => ({ item: x, score: scoreCandidate(x, key) }))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length || ranked[0].score < 5) {
    throw Error(`Non trovo una squadra Sofascore affidabile per ${config.name}. ${errors.join(" | ")}`);
  }

  const best = ranked[0].item;
  return {
    id: String(best.id),
    name: best.name,
    slug: best.slug || null,
    gender: best.gender || null,
    logo: best.imageUrl || null,
    candidates: ranked.slice(0, 5).map(x => ({
      id: String(x.item.id),
      name: x.item.name,
      score: x.score
    }))
  };
}

async function discoverTeams() {
  const teams = {};
  for (const key of Object.keys(TEAMS)) {
    teams[key] = await safe(() => findTeam(key));
  }
  return { source: "Sofascore", teams };
}

function involves(event, found, key) {
  const ids = [event.homeTeam?.id, event.awayTeam?.id].filter(Boolean).map(String);
  if (ids.includes(String(found.id))) return true;

  const names = [event.homeTeam?.name, event.awayTeam?.name].filter(Boolean).map(norm);
  const aliases = TEAMS[key].aliases.map(norm);
  return names.some(n => aliases.some(a => n === a || (a.length > 6 && n.includes(a))));
}

function simplifyEvent(e, key, teamId) {
  return {
    id: String(e.id),
    customId: e.customId || null,
    team: TEAMS[key].name,
    source: "Sofascore",
    tournament: e.tournament?.name || null,
    tournamentId: e.tournament?.uniqueTournament?.id || e.tournament?.id || null,
    seasonId: e.season?.id || null,
    round: e.roundInfo?.round ?? null,
    date: e.startTimestamp ? new Date(e.startTimestamp * 1000).toISOString() : null,
    timestamp: e.startTimestamp ?? null,
    status: e.status?.description || e.status?.type || null,
    homeTeam: e.homeTeam ? {
      id: String(e.homeTeam.id),
      name: e.homeTeam.name,
      logo: `/api/logo?id=${e.homeTeam.id}`
    } : null,
    awayTeam: e.awayTeam ? {
      id: String(e.awayTeam.id),
      name: e.awayTeam.name,
      logo: `/api/logo?id=${e.awayTeam.id}`
    } : null,
    homeScore: e.homeScore?.current ?? null,
    awayScore: e.awayScore?.current ?? null,
    venue: e.venue || null,
    winnerCode: e.winnerCode ?? null,
    isHome: String(e.homeTeam?.id) === String(teamId),
    raw: e
  };
}

async function collectEventPages(teamId, direction, pages) {
  const all = [];
  const errors = [];

  for (let page = 0; page < pages; page++) {
    try {
      const d = await fetchJSON(`/team/${teamId}/events/${direction}/${page}`);
      const events = d.events || [];
      all.push(...events);
      if (d.hasNextPage === false || events.length === 0) break;
    } catch (e) {
      errors.push(String(e.message || e));
      break;
    }
  }

  return { events: all, errors };
}

async function getMatches(key, direction, limit, pages) {
  const found = await findTeam(key);
  const dirs = direction === "last" ? ["last"] : direction === "next" ? ["next"] : ["last", "next"];
  const results = await Promise.all(dirs.map(d => collectEventPages(found.id, d, pages)));
  const unique = new Map();

  for (const r of results) {
    for (const e of r.events) {
      if (involves(e, found, key)) unique.set(String(e.id), e);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const events = [...unique.values()]
    .filter(e => {
      if (direction === "last") return (e.startTimestamp || 0) <= now;
      if (direction === "next") return (e.startTimestamp || 0) > now;
      return true;
    })
    .sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0))
    .map(e => simplifyEvent(e, key, found.id));

  return {
    team: { id: found.id, name: found.name },
    direction,
    count: Math.min(events.length, limit),
    totalCollected: events.length,
    events: events.slice(0, limit),
    pagesPerDirection: pages,
    source: "Sofascore",
    errors: results.flatMap(r => r.errors),
    note: "Aumenta ?pages=10 per tentare di recuperare più partite. La fonte può limitare lo storico disponibile."
  };
}

async function getRoster(key) {
  const found = await findTeam(key);
  const d = await fetchJSON(`/team/${found.id}/players`);
  const players = (d.players || []).map(entry => {
    const p = entry.player || entry;
    return {
      id: p.id ?? null,
      name: p.name || null,
      shortName: p.shortName || null,
      position: p.position || null,
      jerseyNumber: p.jerseyNumber ?? null,
      height: p.height ?? null,
      dateOfBirthTimestamp: p.dateOfBirthTimestamp ?? null,
      nationality: p.country?.name || null,
      marketValue: p.proposedMarketValue ?? null,
      injured: p.injured ?? null,
      injuryInformation: p.injuryInformation || null,
      raw: p
    };
  });

  return {
    team: { id: found.id, name: found.name },
    count: players.length,
    players,
    source: "Sofascore"
  };
}

async function getAbsences(key) {
  const roster = await getRoster(key);
  const unavailable = roster.players.filter(p => p.injured || p.injuryInformation);
  return {
    team: roster.team,
    count: unavailable.length,
    unavailable,
    source: "Sofascore",
    note: "Sofascore potrebbe non pubblicare tutti gli infortuni e le squalifiche. Una lista vuota non dimostra che non ci siano indisponibili."
  };
}

async function getCompetitions(key) {
  const found = await findTeam(key);
  const d = await fetchJSON(`/team/${found.id}/unique-tournaments`);
  const tournaments = (d.uniqueTournaments || d.tournaments || []).map(entry => {
    const t = entry.uniqueTournament || entry.tournament || entry;
    return {
      id: t.id ?? null,
      name: t.name || null,
      slug: t.slug || null,
      category: t.category?.name || null,
      country: t.category?.country?.name || null,
      raw: entry
    };
  }).filter(x => x.id);

  return {
    team: { id: found.id, name: found.name },
    count: tournaments.length,
    tournaments,
    source: "Sofascore"
  };
}

async function getStandings(key) {
  const comps = await getCompetitions(key);
  const output = [];

  for (const tournament of comps.tournaments) {
    const seasons = await safe(() => fetchJSON(`/unique-tournament/${tournament.id}/seasons`));
    const season = seasons.seasons?.[0];

    if (!season?.id) {
      output.push({ tournament, error: seasons.error || "Stagione non disponibile" });
      continue;
    }

    const table = await safe(() => fetchJSON(`/unique-tournament/${tournament.id}/season/${season.id}/standings/total`));
    output.push({
      tournament,
      season,
      standings: table.standings || null,
      error: table.error || null
    });
  }

  return { team: comps.team, competitions: output, source: "Sofascore" };
}

async function getStats(key) {
  const found = await findTeam(key);
  const comps = await getCompetitions(key);
  const recent = await safe(() => getMatches(key, "last", 20, 3));
  const output = [];

  for (const tournament of comps.tournaments) {
    const seasons = await safe(() => fetchJSON(`/unique-tournament/${tournament.id}/seasons`));
    const season = seasons.seasons?.[0];

    if (!season?.id) {
      output.push({ tournament, error: seasons.error || "Stagione non disponibile" });
      continue;
    }

    const stats = await safe(() => fetchJSON(
      `/team/${found.id}/unique-tournament/${tournament.id}/season/${season.id}/statistics/overall`
    ));

    output.push({
      tournament,
      season,
      statistics: stats.statistics || stats,
      error: stats.error || null
    });
  }

  return {
    team: { id: found.id, name: found.name },
    competitions: output,
    recentMatches: recent.events || recent,
    source: "Sofascore"
  };
}

async function eventPart(id, part) {
  const data = await fetchJSON(`/event/${encodeURIComponent(id)}/${part}`);
  return { eventId: String(id), part, data, source: "Sofascore" };
}

async function eventDetails(id) {
  const parts = ["", "/statistics", "/lineups", "/incidents", "/h2h"];
  const results = await Promise.all(parts.map(async suffix => ({
    name: suffix || "event",
    data: await safe(() => fetchJSON(`/event/${encodeURIComponent(id)}${suffix}`))
  })));

  const output = { eventId: String(id), source: "Sofascore" };
  for (const r of results) output[r.name] = r.data;
  return output;
}

async function summary(key, limit) {
  const [matches, roster, absences, competitions, standings, statistics] = await Promise.all([
    safe(() => getMatches(key, "all", limit, 5)),
    safe(() => getRoster(key)),
    safe(() => getAbsences(key)),
    safe(() => getCompetitions(key)),
    safe(() => getStandings(key)),
    safe(() => getStats(key))
  ]);

  return {
    team: TEAMS[key].name,
    generatedAt: new Date().toISOString(),
    source: "Sofascore",
    matches,
    roster,
    absences,
    competitions,
    standings,
    statistics
  };
}

// RSS di Google News: raccoglie risultati indicizzati per le fonti richieste.
// Non equivale a un accesso diretto a tutte le notizie o a tutti i post social.
async function getNews(requestedTeam, limit) {
  const key = getTeam(requestedTeam);
  let sources = NEWS_SOURCES;

  if (key === "primavera") {
    sources = NEWS_SOURCES.filter(s => /Primavera|Sky Sport|Gazzetta|Tuttomercatoweb|OneFootball|Google News/i.test(s.name));
  } else if (key === "women") {
    sources = NEWS_SOURCES.filter(s => /Women|Sky Sport|Gazzetta|Tuttomercatoweb|OneFootball|Google News/i.test(s.name));
  }

  const results = await Promise.allSettled(sources.map(async source => {
    const url = "https://news.google.com/rss/search?q=" +
      encodeURIComponent(source.query) + "&hl=it&gl=IT&ceid=IT:it";
    const xml = await fetchText(url);
    return parseRSS(xml).map(article => ({ ...article, source: source.name }));
  }));

  const all = [];
  const status = [];

  results.forEach((r, i) => {
    status.push({
      source: sources[i].name,
      ok: r.status === "fulfilled",
      error: r.status === "rejected" ? String(r.reason.message || r.reason) : null
    });
    if (r.status === "fulfilled") all.push(...r.value);
  });

  const unique = new Map();
  for (const article of all) {
    if (!article.url || !article.title) continue;
    if (!unique.has(article.url)) unique.set(article.url, article);
  }

  const articles = [...unique.values()]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, limit);

  return {
    team: key ? TEAMS[key].name : requestedTeam,
    count: articles.length,
    articles,
    sources: status,
    note: "Le notizie sono risultati RSS di Google News filtrati per query e dominio. Non sono garantiti tutti gli articoli, gli aggiornamenti social o l'accesso completo ai siti."
  };
}

function parseRSS(xml) {
  const entries = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return entries.map(match => {
    const block = match[0];
    const tag = name => {
      const found = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
      return found ? decodeXML(found[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : null;
    };

    return {
      title: cleanHTML(tag("title")),
      summary: cleanHTML(tag("description")),
      date: tag("pubDate"),
      url: tag("link"),
      guid: tag("guid")
    };
  });
}

function decodeXML(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function cleanHTML(value) {
  return decodeXML(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
