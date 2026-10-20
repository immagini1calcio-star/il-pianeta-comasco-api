
 // IL PIANETA COMASCO API — ESPN + SOFASCORE
// Inserire in api/[...route].js — Node.js 20+
// Nota: gli endpoint pubblici Sofascore non sono un'API ufficiale garantita.

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
const SOFA = "https://www.sofascore.com/api/v1";

const TEAMS = {
  como: {
    key: "como",
    name: "Como",
    type: "prima squadra maschile",
    league: "ita.1",
    espnId: "2572",
    aliases: ["como", "como 1907", "calcio como"]
  },
  primavera: {
    key: "primavera",
    name: "Como Primavera",
    type: "primavera",
    league: null,
    espnId: null,
    aliases: ["como primavera", "como u19", "como under 19"]
  },
  women: {
    key: "women",
    name: "Como Women",
    type: "femminile",
    league: null,
    espnId: null,
    aliases: ["como women", "como femminile", "como women 1907"]
  }
};

const RSS = [
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=Como+1907+calcio&hl=it&gl=IT&ceid=IT:it"
  },
  {
    name: "Tuttomercatoweb",
    url: "https://www.tuttomercatoweb.com/rss/?section=calcio"
  },
  {
    name: "Sky Sport",
    url: "https://sport.sky.it/rss/sport_calcio.xml"
  },
  {
    name: "Gazzetta",
    url: "https://www.gazzetta.it/rss/Calcio.xml"
  }
];

const cache = new Map();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const u = new URL(
    req.url,
    `https://${req.headers.host || "localhost"}`
  );

  const route = (
    u.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "") || "health"
  ).toLowerCase();

  const q = u.searchParams;
  const key = teamKey(
    q.get("team") || q.get("squadra") || route.split("/")[0]
  );

  const team = TEAMS[key];
  const limit = clamp(q.get("limit"), 1, 100, 50);
  const id = q.get("id") || q.get("eventId");

  try {
    let out;

    if (route === "health") {
      out = {
        ok: true,
        service: "Il Pianeta Comasco API",
        version: "4.0.0",
        sources: ["ESPN", "Sofascore", "RSS giornalistici"],
        endpoints: endpoints()
      };
    } else if (route === "configurazione" || route === "config") {
      out = {
        teams: Object.values(TEAMS),
        sources: {
          primaSquadra: ["ESPN prioritario", "Sofascore integrazione"],
          primaveraWomen: ["Sofascore prioritario", "ESPN se disponibile"],
          news: RSS.map(x => x.name)
        },
        note: "ID Sofascore cercati dinamicamente; confermare i risultati per Primavera e Women."
      };
    } else if (route === "squadre") {
      out = await discoverTeams();
    } else if (route === "competizioni" || route === "coppe") {
      out = {
        competitions: [
          { id: "ita.1", name: "Serie A" },
          { id: "ita.2", name: "Serie B" },
          { id: "ita.coppa_italia", name: "Coppa Italia" },
          { id: "uefa.champions", name: "Champions League" },
          { id: "uefa.europa", name: "Europa League" },
          { id: "uefa.europa.conf", name: "Conference League" }
        ]
      };
    } else if (
      route === "notizie" ||
      route === "news" ||
      route.endsWith("/notizie")
    ) {
      out = await news(q.get("team") || q.get("squadra") || "Como", limit);
    } else if (route === "tutto") {
      out = {
        generatedAt: new Date().toISOString(),
        teams: await allSummaries(limit),
        notizie: await news("Como", limit)
      };
    } else if (
      route === "partita" ||
      route === "evento" ||
      route === "match"
    ) {
      if (!id) throw Error("Serve ?id=ID_PARTITA");
      out = await match(id, q.get("league") || "ita.1", false);
    } else if (route === "formazioni" || route === "lineups") {
      if (!id) throw Error("Serve ?id=ID_PARTITA");
      out = await match(id, q.get("league") || "ita.1", true);
    } else if (route === "scontri-diretti" || route === "h2h") {
      out = await h2h(team, q.get("opponent") || q.get("avversaria") || "");
    } else {
      const sub = route.split("/").pop();

      if (!team) {
        throw Error(
          "Squadra non riconosciuta. Usa team=como, team=primavera o team=women."
        );
      }

      if (
        ["partite", "calendario", "programma", "scoreboard"].includes(sub)
      ) {
        out = await matches(
          team,
          limit,
          q.get("direction") || "all",
          q.get("season")
        );
      } else if (["rosa", "giocatori"].includes(sub)) {
        out = await roster(team);
      } else if (["indisponibili", "infortuni"].includes(sub)) {
        out = await absences(team);
      } else if (
        ["statistiche", "statistiche-squadra"].includes(sub)
      ) {
        out = await stats(team);
      } else if (sub === "classifica") {
        out = await standings(team);
      } else {
        out = await summary(team, limit);
      }
    }

    return send(res, 200, out);
  } catch (e) {
    return send(res, 502, {
      error: "Recupero dati non riuscito",
      message: String(e.message || e),
      endpoint: route,
      team: team?.name || null,
      note: "Una fonte può essere limitata o non avere dati per questa squadra."
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
    "/api/rosa?team=como",
    "/api/indisponibili?team=como",
    "/api/statistiche?team=como",
    "/api/notizie?team=Como",
    "/api/como/riepilogo",
    "/api/primavera/riepilogo",
    "/api/women/riepilogo",
    "/api/partita?id=ID",
    "/api/formazioni?id=ID",
    "/api/scontri-diretti?team=como&opponent=Juventus",
    "/api/tutto"
  ];
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(obj, null, 2));
}

function clamp(v, min, max, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min
    ? Math.min(max, Math.floor(n))
    : fallback;
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamKey(s) {
  const n = norm(s);

  if (
    n.includes("primavera") ||
    n.includes("u19") ||
    n.includes("under 19")
  ) return "primavera";

  if (
    n.includes("women") ||
    n.includes("femmin") ||
    n.includes("donne")
  ) return "women";

  if (!n || n === "como" || n.includes("como")) return "como";

  return null;
}

async function get(url, source = "fonte") {
  const old = cache.get(url);
  if (old && Date.now() - old.t < 60000) return old.v;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 IlPianetaComasco/4.0",
        "Accept": "application/json,application/rss+xml,application/xml,*/*",
        "Referer": source === "Sofascore"
          ? "https://www.sofascore.com/"
          : "https://www.espn.com/"
      }
    });

    if (!r.ok) throw Error(`${source} HTTP ${r.status}`);

    const v = await r.json();
    cache.set(url, { t: Date.now(), v });
    return v;
  } finally {
    clearTimeout(timer);
  }
}

async function textFetch(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 IlPianetaComasco/4.0" }
  });

  if (!r.ok) throw Error(`RSS HTTP ${r.status}`);
  return r.text();
}

async function first(tasks) {
  const errors = [];

  for (const fn of tasks) {
    try {
      return await fn();
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }

  throw Error(errors.join(" | "));
}

async function sofaTeam(t) {
  const d = await get(
    `${SOFA}/search/all?q=${encodeURIComponent(t.name)}`,
    "Sofascore"
  );

  const arr = [
    ...(d.teams || []),
    ...(d.results || [])
      .filter(x => x.type === "team")
      .map(x => x.entity || x),
    ...(d.suggestions || [])
      .filter(x => x.type === "team")
      .map(x => x.entity || x)
  ];

  const names = t.aliases.map(norm);

  const ranked = arr.map(x => ({
    x,
    s:
      (names.includes(norm(x.name)) ? 10 : 0) +
      (norm(x.name).includes("como") ? 4 : 0) +
      ((t.key === "women" && /women|femmin/.test(norm(x.name))) ? 8 : 0) +
      ((t.key === "primavera" && /u19|under 19|primavera/.test(norm(x.name))) ? 8 : 0)
  }))
  .filter(x => x.s >= 4)
  .sort((a, b) => b.s - a.s);

  if (!ranked.length) {
    throw Error(`Sofascore non ha trovato ${t.name}`);
  }

  return {
    id: String(ranked[0].x.id),
    name: ranked[0].x.name,
    raw: ranked[0].x
  };
}

async function sofaTeamData(t, path) {
  const team = await sofaTeam(t);

  return {
    team,
    data: await get(`${SOFA}/team/${team.id}${path}`, "Sofascore")
  };
}

function isComo(e) {
  const n = norm([
    e?.name,
    e?.homeTeam?.name,
    e?.awayTeam?.name,
    ...(e?.competitors || []).map(x => x.name || x.team?.displayName),
    e?.raw?.name
  ].filter(Boolean).join(" "));

  return n.includes("como");
}

function sofaEvent(e, t) {
  return {
    id: String(e.id || ""),
    source: "Sofascore",
    sourceIds: { sofascore: String(e.id || "") },
    team: t.name,
    competition: e.tournament?.name || e.uniqueTournament?.name || null,
    name: `${e.homeTeam?.name || "Casa"} - ${e.awayTeam?.name || "Trasferta"}`,
    date: e.startTimestamp
      ? new Date(e.startTimestamp * 1000).toISOString()
      : null,
    status: e.status?.description || e.status?.type || null,
    homeTeam: e.homeTeam,
    awayTeam: e.awayTeam,
    homeScore: e.homeScore ?? null,
    awayScore: e.awayScore ?? null,
    venue: e.venue || null,
    raw: e
  };
}

function espnEvent(e, league) {
  const c = e.competitions?.[0] || {};

  return {
    id: String(e.id || ""),
    source: "ESPN",
    sourceIds: { espn: String(e.id || "") },
    league,
    competition: e.league?.name || c.league?.name || null,
    name: e.name || e.shortName || "",
    date: e.date || null,
    status: e.status?.type?.description || e.status?.type?.name || null,
    venue: c.venue?.fullName || c.venue?.name || null,
    competitors: (c.competitors || []).map(x => ({
      id: String(x.id || x.team?.id || ""),
      name: x.team?.displayName || x.team?.name || "",
      homeAway: x.homeAway,
      score: x.score ?? null,
      winner: x.winner ?? null,
      raw: x
    })),
    raw: e
  };
}

async function matches(t, limit, direction = "all", season) {
  const tasks = [];

  tasks.push(async () => {
    const { data } = await sofaTeamData(t, "/events/last");
    return (data.events || [])
      .map(e => sofaEvent(e, t))
      .filter(isComo);
  });

  tasks.push(async () => {
    const { data } = await sofaTeamData(t, "/events/next");
    return (data.events || [])
      .map(e => sofaEvent(e, t))
      .filter(isComo);
  });

  if (t.espnId && t.league) {
    tasks.push(async () => {
      const u = `${ESPN}/${t.league}/teams/${t.espnId}/schedule${
        season ? "?season=" + encodeURIComponent(season) : ""
      }`;

      const d = await get(u, "ESPN");

      return (d.events || [])
        .map(e => espnEvent(e, t.league))
        .filter(isComo);
    });
  }

  const results = await Promise.allSettled(tasks.map(f => f()));

  let events = results.flatMap(r =>
    r.status === "fulfilled" ? r.value : []
  );

  const map = new Map();

  for (const e of events) {
    const k = norm(e.name) + "|" + String(e.date || "").slice(0, 10);

    if (!map.has(k)) {
      map.set(k, e);
    } else {
      const old = map.get(k);

      map.set(k, {
        ...old,
        ...e,
        source: old.source === e.source ? e.source : "ESPN+Sofascore",
        sourceIds: { ...old.sourceIds, ...e.sourceIds }
      });
    }
  }

  events = [...map.values()]
    .filter(isComo)
    .filter(e =>
      direction === "all" ||
      (direction === "last"
        ? new Date(e.date) <= new Date()
        : new Date(e.date) > new Date())
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    team: t.name,
    count: Math.min(events.length, limit),
    events: events.slice(0, limit),
    sources: results.map((r, i) => ({
      source: i < 2 ? "Sofascore" : "ESPN",
      ok: r.status === "fulfilled",
      error: r.status === "rejected"
        ? String(r.reason.message || r.reason)
        : null
    })),
    note: "Solo partite che coinvolgono una squadra del Como. La disponibilità dell'intera stagione dipende dalla fonte."
  };
}

async function roster(t) {
  const results = await Promise.allSettled([
    sofaTeamData(t, "/players"),
    ...(t.espnId && t.league
      ? [get(`${ESPN}/${t.league}/teams/${t.espnId}/roster`, "ESPN")]
      : [])
  ]);

  let players = [];

  if (results[0].status === "fulfilled") {
    const d = results[0].value.data;

    players.push(
      ...(d.players || [])
        .flatMap(x => x.players || [x])
        .map(x => {
          const p = x.player || x;

          return {
            name: p.name || null,
            id: p.id || null,
            position: p.position || null,
            shirtNumber: p.shirtNumber ?? null,
            nationality: p.country?.name || null,
            source: "Sofascore",
            raw: p
          };
        })
    );
  }

  if (results[1]?.status === "fulfilled") {
    const d = results[1].value;

    players.push(
      ...(d.athletes || [])
        .flatMap(x => x.items || x.athletes || [x])
        .map(p => ({
          name: p.fullName || p.displayName || p.name,
          id: p.id || null,
          position: p.position?.displayName || p.position || null,
          jersey: p.jersey || null,
          source: "ESPN",
          raw: p
        }))
    );
  }

  const map = new Map();

  for (const p of players) {
    if (!p.name) continue;

    const k = norm(p.name);

    map.set(k, {
      ...(map.get(k) || {}),
      ...p,
      sources: [
        ...new Set([...(map.get(k)?.sources || []), p.source])
      ]
    });
  }

  return {
    team: t.name,
    count: map.size,
    players: [...map.values()],
    sources: results.map((r, i) => ({
      source: i === 0 ? "Sofascore" : "ESPN",
      ok: r.status === "fulfilled",
      error: r.status === "rejected"
        ? String(r.reason.message || r.reason)
        : null
    })),
    note: map.size
      ? null
      : "Nessuna rosa trovata: verificare l'ID della squadra Sofascore."
  };
}

async function absences(t) {
  const r = await roster(t);
  const players = r.players.filter(p => p.injuryStatus || p.injured);

  let espn = [];

  if (t.espnId && t.league) {
    try {
      const d = await get(
        `${ESPN}/${t.league}/teams/${t.espnId}/injuries`,
        "ESPN"
      );

      espn = d.injuries || d.items || [];
    } catch {}
  }

  return {
    team: t.name,
    unavailable: [...players, ...espn],
    note: "Gli elenchi di infortunati possono essere incompleti. Nessun giocatore viene considerato disponibile solo perché non compare nell'elenco."
  };
}

async function stats(t) {
  const r = await Promise.allSettled([
    sofaTeamData(t, "/unique-tournaments"),
    matches(t, 20, "last"),
    ...(t.espnId && t.league
      ? [get(`${ESPN}/${t.league}/teams/${t.espnId}/statistics`, "ESPN")]
      : [])
  ]);

  return {
    team: t.name,
    sofascoreCompetitions: r[0].status === "fulfilled"
      ? (r[0].value.data.uniqueTournaments || r[0].value.data.tournaments || [])
      : { error: String(r[0].reason.message || r[0].reason) },
    ultimePartite: r[1].status === "fulfilled"
      ? r[1].value.events
      : [],
    espn: r[2]?.status === "fulfilled"
      ? r[2].value
      : {
          error: r[2]
            ? String(r[2].reason.message || r[2].reason)
            : "ESPN non configurato"
        }
  };
}

async function standings(t) {
  const { data } = await sofaTeamData(t, "/unique-tournaments");
  const tournaments = data.uniqueTournaments || data.tournaments || [];
  const out = [];

  for (const x of tournaments.slice(0, 6)) {
    const tour = x.uniqueTournament || x;
    if (!tour.id) continue;

    const s = await safe(() =>
      get(`${SOFA}/unique-tournament/${tour.id}/seasons`, "Sofascore")
    );

    if (s.error || !s.seasons?.[0]) continue;

    const season = s.seasons[0];

    const table = await safe(() =>
      get(
        `${SOFA}/unique-tournament/${tour.id}/season/${season.id}/standings/total`,
        "Sofascore"
      )
    );

    out.push({ tournament: tour.name, season, table });
  }

  return { team: t.name, competitions: out };
}

async function match(id, league, lineups) {
  const tasks = [
    safe(() => get(`${SOFA}/event/${encodeURIComponent(id)}`, "Sofascore")),
    safe(() =>
      get(
        `${SOFA}/event/${encodeURIComponent(id)}/${lineups ? "lineups" : "statistics"}`,
        "Sofascore"
      )
    )
  ];

  if (league) {
    tasks.push(
      safe(() =>
        get(
          `${ESPN}/${encodeURIComponent(league)}/summary?event=${encodeURIComponent(id)}`,
          "ESPN"
        )
      )
    );
  }

  const [event, extra, espn] = await Promise.all(tasks);
  const e = event.event || event;

  return {
    event: e,
    details: extra,
    espn: espn || null,
    onlyComoMatch: isComo(e),
    note: "L'ID Sofascore e l'ID ESPN sono diversi: usa l'ID della fonte corretta."
  };
}

async function h2h(t, opponent) {
  if (!opponent) throw Error("Aggiungi ?opponent=NomeSquadra");

  const m = await matches(t, 100, "all");
  const n = norm(opponent);

  const events = m.events.filter(e =>
    norm(e.name || "").includes(n) ||
    (e.competitors || []).some(c => norm(c.name).includes(n)) ||
    norm(e.homeTeam?.name || "").includes(n) ||
    norm(e.awayTeam?.name || "").includes(n)
  );

  return {
    team: t.name,
    opponent,
    count: events.length,
    events
  };
}

async function news(requested, limit) {
  const k = teamKey(requested) || "como";
  const t = TEAMS[k];

  const results = await Promise.allSettled(
    RSS.map(async s => {
      const xml = await textFetch(s.url);

      return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)]
        .map(m => {
          const b = m[0];

          const getTag = tag => {
            const x = b.match(
              new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
            );

            return x
              ? decode(
                  x[1]
                    .replace(/<!\[CDATA\[|\]\]>/g, "")
                    .replace(/<[^>]*>/g, " ")
                    .trim()
                )
              : null;
          };

          return {
            source: s.name,
            title: getTag("title"),
            summary: getTag("description") || getTag("summary"),
            date: getTag("pubDate") || getTag("published"),
            url: getTag("link") || getTag("guid")
          };
        })
        .filter(x => x.title && x.url);
    })
  );

  const aliases = t.aliases.map(norm);
  let all = [];

  results.forEach(r => {
    if (r.status === "fulfilled") all.push(...r.value);
  });

  all = all.filter(a => {
    const text = norm(a.title + " " + (a.summary || ""));

    if (k === "women") {
      return text.includes("como women") || text.includes("como femminile");
    }

    if (k === "primavera") {
      return (
        text.includes("como primavera") ||
        text.includes("como u19") ||
        text.includes("como under 19")
      );
    }

    return text.includes("como") || aliases.some(x => text.includes(x));
  });

  const map = new Map();

  for (const a of all) {
    if (!map.has(a.url)) map.set(a.url, a);
  }

  const articles = [...map.values()]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, limit);

  return {
    team: t.name,
    count: articles.length,
    articles,
    sources: results.map((r, i) => ({
      name: RSS[i].name,
      ok: r.status === "fulfilled",
      error: r.status === "rejected"
        ? String(r.reason.message || r.reason)
        : null
    })),
    note: "Feed RSS filtrati per la squadra. Sofascore fornisce dati sportivi, non un archivio completo di notizie giornalistiche."
  };
}

async function discoverTeams() {
  return Promise.all(
    Object.values(TEAMS).map(async t => ({
      key: t.key,
      name: t.name,
      espnId: t.espnId,
      sofascore: await safe(() => sofaTeam(t))
    }))
  );
}

async function summary(t, limit) {
  const r = await Promise.allSettled([
    matches(t, limit),
    roster(t),
    absences(t),
    stats(t),
    standings(t),
    news(t.name, limit)
  ]);

  const val = x =>
    x.status === "fulfilled"
      ? x.value
      : { error: String(x.reason.message || x.reason) };

  return {
    team: t.name,
    generatedAt: new Date().toISOString(),
    partite: val(r[0]),
    rosa: val(r[1]),
    indisponibili: val(r[2]),
    statistiche: val(r[3]),
    classifica: val(r[4]),
    notizie: val(r[5])
  };
}

async function allSummaries(limit) {
  const out = {};

  for (const t of Object.values(TEAMS)) {
    out[t.key] = await safe(() => summary(t, limit));
  }

  return out;
}

async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}
