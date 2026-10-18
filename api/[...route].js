
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const LEAGUES = {
  "ita.1": "Serie A",
  "ita.2": "Serie B",
  "ita.coppa_italia": "Coppa Italia",
  "uefa.champions": "Champions League",
  "uefa.europa": "Europa League",
  "uefa.europa.conf": "Conference League"
};

const COMO_NAMES = [
  "Como",
  "Como 1907",
  "Como Women",
  "Como Primavera"
];

const cache = new Map();
const CACHE_MS = 60 * 1000;

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=30");
  res.end(JSON.stringify(data));
}

async function getJSON(url) {
  const now = Date.now();
  const cached = cache.get(url);

  if (cached && now - cached.time < CACHE_MS) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`ESPN ha risposto con HTTP ${response.status}`);
  }

  const data = await response.json();
  cache.set(url, { time: now, data });
  return data;
}

function leagueFrom(query) {
  const league = query.get("league") || "ita.1";
  return LEAGUES[league] ? league : "ita.1";
}

function leagueURL(league, endpoint) {
  return `${ESPN_BASE}/${league}/${endpoint}`;
}

function eventSummary(event) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find(item => item.homeAway === "home");
  const away = competitors.find(item => item.homeAway === "away");

  return {
    id: event.id,
    nome: event.name || null,
    data: event.date || null,
    competizione: event.season?.name || null,
    stato: event.status?.type?.description || null,
    statoBreve: event.status?.type?.name || null,
    risultato: {
      casa: home?.score ?? null,
      trasferta: away?.score ?? null
    },
    casa: home ? {
      id: home.team?.id || null,
      nome: home.team?.displayName || null,
      abbreviazione: home.team?.abbreviation || null,
      logo: home.team?.logo || null,
      risultato: home.score ?? null,
      vincitore: home.winner ?? false
    } : null,
    trasferta: away ? {
      id: away.team?.id || null,
      nome: away.team?.displayName || null,
      abbreviazione: away.team?.abbreviation || null,
      logo: away.team?.logo || null,
      risultato: away.score ?? null,
      vincitore: away.winner ?? false
    } : null,
    stadio: competition?.venue?.fullName || null,
    arbitro: competition?.competitors?.[0]?.roster || null,
    link: event.links?.[0]?.href || null
  };
}

async function getEvents(league, extra = "") {
  const url = leagueURL(league, `scoreboard${extra}`);
  const data = await getJSON(url);
  return (data.events || []).map(eventSummary);
}

async function findTeam(league, search = "Como") {
  const data = await getJSON(
    leagueURL(league, "teams?limit=100")
  );

  const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
  const normalized = search.toLowerCase();

  let match = teams.find(item =>
    (item.team?.displayName || "").toLowerCase() === normalized
  );

  if (!match) {
    match = teams.find(item =>
      (item.team?.displayName || "").toLowerCase().includes(normalized)
    );
  }

  return match?.team || null;
}

async function teamResource(league, resource, search = "Como") {
  const team = await findTeam(league, search);

  if (!team?.id) {
    return {
      trovato: false,
      squadra: search,
      competizione: LEAGUES[league],
      messaggio: "Squadra non trovata nei dati ESPN per questa competizione."
    };
  }

  const data = await getJSON(
    leagueURL(league, `teams/${team.id}/${resource}`)
  );

  return {
    trovato: true,
    squadra: team,
    dati: data
  };
}

async function standings(league) {
  return await getJSON(leagueURL(league, "standings"));
}

async function allTeams(league) {
  return await getJSON(leagueURL(league, "teams?limit=100"));
}

async function gameDetails(league, eventId) {
  return await getJSON(
    leagueURL(league, `summary?event=${encodeURIComponent(eventId)}`)
  );
}

async function handle(path, query) {
  const league = leagueFrom(query);
  const search = query.get("squadra") || "Como";

  if (path === "health") {
    return {
      ok: true,
      service: "Il Pianeta Comasco API",
      version: "4.0.0",
      fonte: "ESPN",
      endpoints: [
        "/api/health",
        "/api/configurazione",
        "/api/competizioni",
        "/api/partite?league=ita.1",
        "/api/calendario?league=ita.1",
        "/api/squadre?league=ita.1",
        "/api/classifica?league=ita.1",
        "/api/rosa?league=ita.1",
        "/api/indisponibili?league=ita.1",
        "/api/statistiche?league=ita.1",
        "/api/partita?id=ID&league=ita.1",
        "/api/formazioni?id=ID&league=ita.1",
        "/api/scontri-diretti?league=ita.1",
        "/api/notizie",
        "/api/como/riepilogo",
        "/api/como/partite",
        "/api/como/rosa",
        "/api/como/indisponibili",
        "/api/como/statistiche",
        "/api/tutto"
      ]
    };
  }

  if (path === "configurazione") {
    return {
      nome: "Il Pianeta Comasco",
      fonteDati: "ESPN",
      competizioni: LEAGUES,
      squadraPrincipale: "Como",
      aggiornamentoCacheSecondi: CACHE_MS / 1000
    };
  }

  if (path === "competizioni") {
    return { competizioni: LEAGUES };
  }

  if (path === "partite" || path === "calendario") {
    return {
      competizione: LEAGUES[league],
      partite: await getEvents(league),
      fonte: "ESPN"
    };
  }

  if (path === "squadre") {
    return {
      competizione: LEAGUES[league],
      dati: await allTeams(league)
    };
  }

  if (path === "classifica") {
    return {
      competizione: LEAGUES[league],
      classifica: await standings(league)
    };
  }

  if (path === "rosa") {
    return await teamResource(league, "roster", search);
  }

  if (path === "indisponibili") {
    return {
      squadra: search,
      competizione: LEAGUES[league],
      messaggio: "ESPN potrebbe non fornire un elenco completo e aggiornato di infortuni e squalifiche.",
      dati: await teamResource(league, "injuries", search)
    };
  }

  if (path === "statistiche") {
    return await teamResource(league, "statistics", search);
  }

  if (path === "partita" || path === "formazioni") {
    const id = query.get("id") || query.get("event");

    if (!id) {
      return {
        errore: true,
        messaggio: "Parametro mancante: usa ?id=ID"
      };
    }

    const details = await gameDetails(league, id);

    if (path === "formazioni") {
      return {
        id,
        competizione: LEAGUES[league],
        formazioni: details.boxscore || null,
        dettagli: details
      };
    }

    return details;
  }

  if (path === "scontri-diretti") {
    const id = query.get("id");

    if (id) {
      return await gameDetails(league, id);
    }

    return {
      competizione: LEAGUES[league],
      messaggio: "Per recuperare i dettagli di una partita, passa il suo ID con ?id=ID.",
      partite: await getEvents(league)
    };
  }

  if (path === "notizie") {
    const url = `${ESPN_BASE}/${league}/news`;
    return await getJSON(url);
  }

  if (path === "como/riepilogo") {
    const [matches, table, roster] = await Promise.allSettled([
      getEvents("ita.1"),
      standings("ita.1"),
      teamResource("ita.1", "roster", "Como")
    ]);

    return {
      squadra: "Como",
      competizione: "Serie A",
      partite: matches.status === "fulfilled" ? matches.value : null,
      classifica: table.status === "fulfilled" ? table.value : null,
      rosa: roster.status === "fulfilled" ? roster.value : null,
      errori: [
        matches.status === "rejected" ? "partite" : null,
        table.status === "rejected" ? "classifica" : null,
        roster.status === "rejected" ? "rosa" : null
      ].filter(Boolean),
      fonte: "ESPN"
    };
  }

  if (path === "como/partite") {
    const events = await getEvents("ita.1");

    const matches = events.filter(event =>
      (event.casa?.nome || "").toLowerCase().includes("como") ||
      (event.trasferta?.nome || "").toLowerCase().includes("como")
    );

    return {
      squadra: "Como",
      competizione: "Serie A",
      partite: matches,
      fonte: "ESPN"
    };
  }

  if (path === "como/rosa") {
    return await teamResource("ita.1", "roster", "Como");
  }

  if (path === "como/indisponibili") {
    return {
      squadra: "Como",
      dati: await teamResource("ita.1", "injuries", "Como"),
      nota: "La copertura di infortuni e squalifiche dipende dai dati disponibili su ESPN."
    };
  }

  if (path === "como/statistiche") {
    return await teamResource("ita.1", "statistics", "Como");
  }

  if (path === "tutto") {
    const [matches, table, roster, news] = await Promise.allSettled([
      getEvents("ita.1"),
      standings("ita.1"),
      teamResource("ita.1", "roster", "Como"),
      getJSON(leagueURL("ita.1", "news"))
    ]);

    return {
      squadra: "Como",
      competizione: "Serie A",
      partite: matches.status === "fulfilled" ? matches.value : null,
      classifica: table.status === "fulfilled" ? table.value : null,
      rosa: roster.status === "fulfilled" ? roster.value : null,
      notizie: news.status === "fulfilled" ? news.value : null,
      errori: {
        partite: matches.status === "rejected" ? String(matches.reason) : null,
        classifica: table.status === "rejected" ? String(table.reason) : null,
        rosa: roster.status === "rejected" ? String(roster.reason) : null,
        notizie: news.status === "rejected" ? String(news.reason) : null
      },
      fonte: "ESPN"
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, {
      ok: false,
      errore: "Metodo non consentito. Usa GET."
    });
  }

  try {
    const url = new URL(
      req.url,
      `https://${req.headers.host || "localhost"}`
    );

    let path = url.pathname.replace(/^\/api\/?/, "");
    path = decodeURIComponent(path).replace(/\/+$/, "");

    const result = await handle(path, url.searchParams);

    if (result === null) {
      return send(res, 404, {
        ok: false,
        errore: "Endpoint non trovato",
        percorso: `/api/${path}`,
        suggerimento: "Controlla /api/health per gli endpoint disponibili."
      });
    }

    return send(res, 200, result);
  } catch (error) {
    return send(res, 502, {
      ok: false,
      errore: "Errore durante il recupero dei dati",
      dettaglio: error?.message || String(error),
      suggerimento: "Riprova più tardi. La fonte esterna potrebbe essere momentaneamente non disponibile."
    });
  }
}
