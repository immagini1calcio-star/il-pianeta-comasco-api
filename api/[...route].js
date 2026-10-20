
const VERSION = "7.0.0";

const TEAMS = {
  como: {
    id: 2704,
    name: "Como",
    aliases: ["como", "prima squadra", "maschile"],
  },
  primavera: {
    id: 206254,
    name: "Como Primavera",
    aliases: ["primavera", "u19", "under 19"],
  },
  women: {
    id: 1114927,
    name: "Como Women",
    aliases: ["women", "femminile", "femminile"],
  },
};

const SOFA = "https://www.sofascore.com/api/v1";
const RSS = "https://news.google.com/rss/search";

const NEWS_SOURCES = [
  { name: "OneFootball", q: 'site:onefootball.com "Como 1907"' },
  { name: "Sky Sport", q: 'site:sport.sky.it Como calcio' },
  { name: "Gazzetta dello Sport", q: 'site:gazzetta.it Como calcio' },
  { name: "Tuttomercatoweb", q: 'site:tuttomercatoweb.com Como' },
  {
    name: "Fabrizio Romano",
    q: '"Fabrizio Romano" Como calcio',
  },
  { name: "Como Primavera", q: '"Como Primavera" calcio' },
  { name: "Como Women", q: '"Como Women" calcio OR "Como femminile"' },
];

const TEAM_ALIASES = {
  como: ["como", "como 1907"],
  primavera: ["como primavera", "primavera"],
  women: ["como women", "como femminile", "femminile"],
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  res.end(JSON.stringify(body, null, 2));
}

function normalizeTeam(value) {
  const v = String(value || "").toLowerCase().trim();

  if (["como", "2704", "prima squadra", "maschile"].includes(v)) {
    return "como";
  }

  if (
    ["primavera", "206254", "u19", "under 19", "como primavera"].includes(v)
  ) {
    return "primavera";
  }

  if (
    ["women", "1114927", "femminile", "como women", "como femminile"].includes(v)
  ) {
    return "women";
  }

  return null;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.sofascore.com/",
      Origin: "https://www.sofascore.com",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${url}`);
  }

  return response.json();
}

async function sofa(path) {
  return fetchJson(`${SOFA}${path}`);
}

async function safeSofa(path) {
  try {
    return await sofa(path);
  } catch (error) {
    return {
      _error: error.message,
      _unavailable: true,
    };
  }
}

function unwrapTeam(data) {
  return data?.team || data?.data?.team || data?.teamInfo || data;
}

function simplifyEvent(event) {
  const home = event?.homeTeam || event?.home_team || {};
  const away = event?.awayTeam || event?.away_team || {};
  const hs = event?.homeScore || event?.home_score || {};
  const as = event?.awayScore || event?.away_score || {};

  return {
    id: event?.id,
    slug: event?.slug,
    data: event?.startTimestamp
      ? new Date(event.startTimestamp * 1000).toISOString()
      : event?.start_time || null,
    stato: event?.status?.description || event?.status?.type || null,
    competizione:
      event?.tournament?.name ||
      event?.uniqueTournament?.name ||
      event?.tournament?.uniqueTournament?.name ||
      null,
    stagione: event?.season?.name || null,
    casa: {
      id: home.id,
      nome: home.name || home.shortName || null,
      stemma: home.id ? `https://www.sofascore.com/api/v1/team/${home.id}/image` : null,
    },
    trasferta: {
      id: away.id,
      nome: away.name || away.shortName || null,
      stemma: away.id ? `https://www.sofascore.com/api/v1/team/${away.id}/image` : null,
    },
    risultato: {
      casa: hs.current ?? hs.display ?? null,
      trasferta: as.current ?? as.display ?? null,
      intervallo_casa: hs.period1 ?? null,
      intervallo_trasferta: as.period1 ?? null,
    },
    vincitore: event?.winnerCode ?? event?.winner_code ?? null,
    campo: event?.venue?.name || null,
    arbitro: event?.referee?.name || null,
    evento_originale: event,
  };
}

async function getEvents(teamKey, direction, pages = 3) {
  const team = TEAMS[teamKey];
  const results = [];
  const errors = [];

  for (let page = 0; page < Math.min(Math.max(Number(pages) || 1, 1), 10); page++) {
    try {
      const data = await sofa(
        `/team/${team.id}/events/${direction}/${page}`
      );
      const events = data?.events || data?.data?.events || [];
      results.push(...events);

      if (events.length === 0 || data?.hasNextPage === false) break;
    } catch (error) {
      errors.push(error.message);
      break;
    }
  }

  return { events: results, errors };
}

async function getMatches(teamKey, direction = "all", pages = 3) {
  if (direction === "next" || direction === "last") {
    const result = await getEvents(teamKey, direction, pages);
    return {
      squadra: TEAMS[teamKey],
      direzione: direction,
      conteggio: result.events.length,
      partite: result.events.map(simplifyEvent),
      errori: result.errors,
      fonte: "Sofascore",
    };
  }

  const [past, future] = await Promise.all([
    getEvents(teamKey, "last", pages),
    getEvents(teamKey, "next", pages),
  ]);

  const unique = new Map();
  for (const event of [...past.events, ...future.events]) {
    unique.set(event.id, event);
  }

  const events = [...unique.values()].sort(
    (a, b) =>
      (a.startTimestamp || 0) - (b.startTimestamp || 0)
  );

  return {
    squadra: TEAMS[teamKey],
    conteggio: events.length,
    partite: events.map(simplifyEvent),
    errori: [...past.errors, ...future.errors],
    fonte: "Sofascore",
  };
}

async function getRoster(teamKey) {
  const id = TEAMS[teamKey].id;
  const data = await sofa(`/team/${id}/players`);
  const players = data?.players || data?.data?.players || [];

  return {
    squadra: TEAMS[teamKey],
    conteggio: players.length,
    rosa: players.map((item) => {
      const p = item.player || item;
      return {
        id: p.id,
        nome: p.name,
        nome_breve: p.shortName,
        ruolo: p.position,
        numero: p.shirtNumber,
        nazionalita: p.country?.name || p.country?.alpha2,
        altezza: p.height,
        piede: p.preferredFoot,
        data_nascita: p.dateOfBirth,
        valore: p.proposedMarketValue || null,
        immagine: p.id
          ? `https://www.sofascore.com/api/v1/player/${p.id}/image`
          : null,
      };
    }),
    fonte: "Sofascore",
  };
}

async function getTeamProfile(teamKey) {
  const team = TEAMS[teamKey];
  const data = await sofa(`/team/${team.id}`);
  const info = unwrapTeam(data);

  return {
    squadra: team,
    profilo: info,
    fonte: "Sofascore",
  };
}

async function getUnavailable(teamKey) {
  const id = TEAMS[teamKey].id;
  const data = await sofa(`/team/${id}/players`);
  const players = data?.players || data?.data?.players || [];

  const roster = players.map((item) => item.player || item);

  const missing = roster.filter(
    (p) =>
      p.injury ||
      p.injured ||
      p.suspension ||
      p.suspended ||
      p.unavailable
  );

  return {
    squadra: TEAMS[teamKey],
    conteggio: missing.length,
    indisponibili: missing.map((p) => ({
      id: p.id,
      nome: p.name,
      ruolo: p.position,
      infortunio: p.injury || null,
      squalifica: p.suspension || null,
      indisponibile: p.unavailable || p.injured || p.suspended || null,
    })),
    nota:
      "Sofascore potrebbe non fornire gli infortuni o le squalifiche in questo endpoint. Una lista vuota non dimostra che tutti siano disponibili.",
    fonte: "Sofascore",
  };
}

async function getCompetitions(teamKey) {
  const id = TEAMS[teamKey].id;
  const data = await sofa(`/team/${id}/unique-tournaments`);
  return {
    squadra: TEAMS[teamKey],
    competizioni: data?.uniqueTournaments || data?.unique_tournaments || [],
    fonte: "Sofascore",
  };
}

async function getTeamStatistics(teamKey) {
  const id = TEAMS[teamKey].id;
  const tournaments = await getCompetitions(teamKey);
  const list = tournaments.competizioni || [];
  const results = [];

  for (const item of list.slice(0, 8)) {
    const tournament = item.uniqueTournament || item;
    const tournamentId = tournament.id;
    if (!tournamentId) continue;

    try {
      const seasonsData = await sofa(
        `/unique-tournament/${tournamentId}/seasons`
      );
      const seasons =
        seasonsData?.seasons || seasonsData?.data?.seasons || [];
      const season = seasons[0];
      if (!season?.id) continue;

      const stats = await safeSofa(
        `/team/${id}/unique-tournament/${tournamentId}/season/${season.id}/statistics/overall`
      );

      results.push({
        competizione: tournament.name,
        competizione_id: tournamentId,
        stagione: season.name,
        stagione_id: season.id,
        statistiche: stats,
      });
    } catch (error) {
      results.push({
        competizione: tournament.name || null,
        errore: error.message,
      });
    }
  }

  return {
    squadra: TEAMS[teamKey],
    statistiche: results,
    fonte: "Sofascore",
  };
}

async function getStandings(teamKey) {
  const tournaments = await getCompetitions(teamKey);
  const list = tournaments.competizioni || [];
  const standings = [];

  for (const item of list.slice(0, 8)) {
    const tournament = item.uniqueTournament || item;
    if (!tournament.id) continue;

    try {
      const seasonData = await sofa(
        `/unique-tournament/${tournament.id}/seasons`
      );
      const seasons = seasonData?.seasons || [];
      const season = seasons[0];
      if (!season?.id) continue;

      const table = await safeSofa(
        `/unique-tournament/${tournament.id}/season/${season.id}/standings/total`
      );

      standings.push({
        competizione: tournament.name,
        stagione: season.name,
        classifica: table,
      });
    } catch (error) {
      standings.push({
        competizione: tournament.name || null,
        errore: error.message,
      });
    }
  }

  return {
    squadra: TEAMS[teamKey],
    classifiche: standings,
    fonte: "Sofascore",
  };
}

async function getEventDetails(eventId) {
  if (!/^\d+$/.test(String(eventId || ""))) {
    throw new Error("Parametro id mancante o non valido.");
  }

  const paths = {
    partita: `/event/${eventId}`,
    formazioni: `/event/${eventId}/lineups`,
    statistiche: `/event/${eventId}/statistics`,
    incidenti: `/event/${eventId}/incidents`,
    scontri_diretti: `/event/${eventId}/h2h`,
  };

  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [
      key,
      await safeSofa(path),
    ])
  );

  return {
    id: Number(eventId),
    ...Object.fromEntries(entries),
    fonte: "Sofascore",
  };
}

function decodeXml(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function xmlTag(item, tag) {
  const match = item.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return match ? decodeXml(match[1].trim()) : null;
}

async function getNews(teamKey) {
  const key = normalizeTeam(teamKey) || "como";
  const teamLabel = TEAMS[key].name;
  const sourceQueries =
    key === "como"
      ? NEWS_SOURCES.slice(0, 5)
      : key === "primavera"
      ? [NEWS_SOURCES[5], { name: "OneFootball", q: 'site:onefootball.com "Como Primavera"' }]
      : [NEWS_SOURCES[6], { name: "Sky Sport", q: 'site:sport.sky.it "Como Women"' }];

  const all = [];

  for (const source of sourceQueries) {
    try {
      const query = encodeURIComponent(`${source.q} when:30d`);
      const url = `${RSS}?q=${query}&hl=it&gl=IT&ceid=IT:it`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) {
        all.push({
          fonte: source.name,
          errore: `Google News RSS HTTP ${response.status}`,
        });
        continue;
      }

      const xml = await response.text();
      const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

      for (const item of items) {
        const title = xmlTag(item, "title");
        const link = xmlTag(item, "link");
        const pubDate = xmlTag(item, "pubDate");
        const description = xmlTag(item, "description");

        if (!title || !link) continue;

        all.push({
          titolo: title,
          link,
          data: pubDate ? new Date(pubDate).toISOString() : null,
          descrizione: description,
          fonte_ricerca: source.name,
          squadra: teamLabel,
        });
      }
    } catch (error) {
      all.push({
        fonte: source.name,
        errore: error.message,
      });
    }
  }

  const seen = new Set();
  const unique = all.filter((article) => {
    if (!article.link) return true;
    if (seen.has(article.link)) return false;
    seen.add(article.link);
    return true;
  });

  return {
    squadra: teamLabel,
    conteggio: unique.filter((a) => a.link).length,
    notizie: unique,
    fonte: "Google News RSS con ricerche per fonte",
    nota:
      "Le notizie sono individuate tramite Google News: non sono feed ufficiali diretti dei singoli editori.",
  };
}

export default async function handler(req, res) {
  const parsed = new URL(req.url, "https://api.local");
  const parts = parsed.pathname.split("/").filter(Boolean);
  const endpoint = parts[1] || parts[0] || "health";
  const query = parsed.searchParams;

  const requestedTeam =
    query.get("team") ||
    query.get("squadra") ||
    (parts[0] === "api" && parts[1] && TEAMS[parts[1]]
      ? parts[1]
      : null);

  const teamKey = normalizeTeam(requestedTeam);
  const pages = Math.min(Math.max(Number(query.get("pages") || 3), 1), 10);

  try {
    if (endpoint === "health") {
      return send(res, 200, {
        ok: true,
        servizio: "Il Pianeta Comasco API",
        versione: VERSION,
        fonte_sport: "Sofascore",
        squadre: TEAMS,
        generatedAt: new Date().toISOString(),
      });
    }

    if (endpoint === "configurazione") {
      return send(res, 200, {
        ok: true,
        versione: VERSION,
        squadre: TEAMS,
        endpoint: [
          "/api/health",
          "/api/configurazione",
          "/api/squadre",
          "/api/partite?team=como",
          "/api/rosa?team=como",
          "/api/indisponibili?team=como",
          "/api/statistiche?team=como",
          "/api/classifica?team=como",
          "/api/competizioni?team=como",
          "/api/notizie?team=como",
          "/api/partita?id=EVENT_ID",
          "/api/formazioni?id=EVENT_ID",
          "/api/statistiche-partita?id=EVENT_ID",
          "/api/incidenti?id=EVENT_ID",
          "/api/scontri-diretti?id=EVENT_ID",
        ],
      });
    }

    if (endpoint === "squadre") {
      const profiles = await Promise.all(
        Object.entries(TEAMS).map(async ([key, team]) => ({
          key,
          ...team,
          dati: await safeSofa(`/team/${team.id}`),
        }))
      );
      return send(res, 200, {
        ok: true,
        squadre: profiles,
        fonte: "Sofascore",
      });
    }

    if (endpoint === "notizie") {
      return send(res, 200, {
        ok: true,
        ...(await getNews(requestedTeam)),
      });
    }

    if (endpoint === "tutto") {
      if (!teamKey) {
        return send(res, 400, {
          ok: false,
          errore: "Usa team=como, team=primavera o team=women.",
        });
      }

      const results = await Promise.allSettled([
        getTeamProfile(teamKey),
        getMatches(teamKey, "all", pages),
        getRoster(teamKey),
        getUnavailable(teamKey),
        getCompetitions(teamKey),
        getTeamStatistics(teamKey),
        getStandings(teamKey),
        getNews(teamKey),
      ]);

      return send(res, 200, {
        ok: true,
        squadra: TEAMS[teamKey],
        risultati: results.map((r) =>
          r.status === "fulfilled"
            ? { ok: true, data: r.value }
            : { ok: false, errore: r.reason?.message || "Errore sconosciuto" }
        ),
      });
    }

    if (
      [
        "partite",
        "calendario",
        "prossime",
        "ultime",
        "rosa",
        "indisponibili",
        "statistiche",
        "classifica",
        "competizioni",
        "riepilogo",
      ].includes(endpoint)
    ) {
      if (!teamKey) {
        return send(res, 400, {
          ok: false,
          endpoint,
          team: requestedTeam,
          error: "Specifica team=como, team=primavera o team=women.",
          squadre: TEAMS,
        });
      }

      let result;

      if (endpoint === "partite" || endpoint === "calendario") {
        result = await getMatches(
          teamKey,
          query.get("direction") || "all",
          pages
        );
      } else if (endpoint === "prossime") {
        result = await getMatches(teamKey, "next", pages);
      } else if (endpoint === "ultime") {
        result = await getMatches(teamKey, "last", pages);
      } else if (endpoint === "rosa") {
        result = await getRoster(teamKey);
      } else if (endpoint === "indisponibili") {
        result = await getUnavailable(teamKey);
      } else if (endpoint === "statistiche") {
        result = await getTeamStatistics(teamKey);
      } else if (endpoint === "classifica") {
        result = await getStandings(teamKey);
      } else if (endpoint === "competizioni") {
        result = await getCompetitions(teamKey);
      } else {
        result = await Promise.allSettled([
          getTeamProfile(teamKey),
          getMatches(teamKey, "all", pages),
          getRoster(teamKey),
          getUnavailable(teamKey),
          getCompetitions(teamKey),
          getTeamStatistics(teamKey),
          getStandings(teamKey),
        ]);
      }

      return send(res, 200, {
        ok: true,
        endpoint,
        team: teamKey,
        data: result,
      });
    }

    if (
      ["partita", "formazioni", "statistiche-partita", "incidenti", "scontri-diretti"].includes(endpoint)
    ) {
      const id = query.get("id");
      if (!id) {
        return send(res, 400, {
          ok: false,
          error: "Manca il parametro id della partita Sofascore.",
        });
      }

      const data = await getEventDetails(id);
      const map = {
        partita: "partita",
        formazioni: "formazioni",
        "statistiche-partita": "statistiche",
        incidenti: "incidenti",
        "scontri-diretti": "scontri_diretti",
      };

      return send(res, 200, {
        ok: !data[map[endpoint]]?._unavailable,
        endpoint,
        id,
        data: data[map[endpoint]],
        fonte: "Sofascore",
      });
    }

    return send(res, 404, {
      ok: false,
      error: "Endpoint non trovato.",
      endpoint_richiesti: [
        "/api/health",
        "/api/configurazione",
        "/api/squadre",
        "/api/partite?team=como",
        "/api/rosa?team=como",
        "/api/indisponibili?team=como",
        "/api/statistiche?team=como",
        "/api/classifica?team=como",
        "/api/competizioni?team=como",
        "/api/notizie?team=como",
        "/api/partita?id=EVENT_ID",
        "/api/formazioni?id=EVENT_ID",
        "/api/statistiche-partita?id=EVENT_ID",
        "/api/incidenti?id=EVENT_ID",
        "/api/scontri-diretti?id=EVENT_ID",
        "/api/tutto?team=como",
      ],
    });
  } catch (error) {
    return send(res, 502, {
      ok: false,
      endpoint,
      team: teamKey,
      error: error.message || "Errore durante il recupero dei dati.",
      source: "Sofascore / Google News RSS",
      note:
        "Se compare HTTP 403, Sofascore sta rifiutando la richiesta. Gli ID fissi evitano la ricerca della squadra, ma non eliminano i blocchi del servizio.",
    });
  }
}
