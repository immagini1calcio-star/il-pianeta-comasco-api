/*
 * IL PIANETA COMASCO — SOFASCORE API
 * File: api/[...route].js
 * Runtime: Node.js 20+
 *
 * Fonte partite: SofaScore.
 * Non usa ESPN.
 * Non inventa dati mancanti.
 */

const BASE = "https://www.sofascore.com/api/v1";

const TEAMS = {
  men: {
    name: "Como",
    id: 2704,
    type: "Prima squadra maschile"
  },
  primavera: {
    name: "Como Primavera",
    id: 206254,
    type: "Primavera maschile"
  },
  women: {
    name: "Como Women",
    id: 1114927,
    type: "Prima squadra femminile"
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "GET") {
    return send(res, 405, { error: "Usa il metodo GET." });
  }

  const url = new URL(
    req.url,
    `https://${req.headers.host || "localhost"}`
  );

  const route =
    url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "") || "health";

  const q = url.searchParams;
  const teamId = Number(q.get("teamId") || q.get("team") || TEAMS.men.id);
  const eventId = q.get("id") || q.get("eventId");

  try {
    let result;

    if (route === "health") {
      result = {
        ok: true,
        service: "Il Pianeta Comasco API",
        version: "SofaScore-1.0",
        source: "SofaScore",
        generatedAt: new Date().toISOString(),
        endpoints: endpoints()
      };

    } else if (route === "config" || route === "configurazione") {
      result = {
        source: "SofaScore",
        teams: TEAMS,
        baseUrl: BASE,
        note: "Gli ID sono ID squadra SofaScore."
      };

    } else if (route === "squadre" || route === "teams") {
      result = {
        source: "SofaScore",
        teams: await Promise.all(
          Object.values(TEAMS).map(async team => ({
            ...team,
            profile: await safe(() => get(`/team/${team.id}`))
          }))
        )
      };

    } else if (route === "squadra" || route === "team") {
      result = await get(`/team/${teamId}`);

    } else if (route === "rosa" || route === "giocatori" || route === "players") {
      result = await get(`/team/${teamId}/players`);

    } else if (route === "forma" || route === "performance") {
      result = await get(`/team/${teamId}/performance`);

    } else if (route === "partite" || route === "calendario" || route === "matches") {
      const direction = q.get("direction") || "all";

      if (!["all", "last", "next"].includes(direction)) {
        throw new Error("direction deve essere all, last oppure next.");
      }

      result = await teamEvents(teamId, direction, q.get("pages"));

    } else if (route === "ultime" || route === "ultime-partite") {
      result = await teamEvents(teamId, "last", q.get("pages"));

    } else if (route === "prossime" || route === "prossime-partite") {
      result = await teamEvents(teamId, "next", q.get("pages"));

    } else if (route === "partita" || route === "evento" || route === "match") {
      if (!eventId) throw new Error("Manca ?id=ID_PARTITA.");
      result = await get(`/event/${encodeURIComponent(eventId)}`);

    } else if (route === "formazioni" || route === "lineups") {
      if (!eventId) throw new Error("Manca ?id=ID_PARTITA.");
      result = await get(`/event/${encodeURIComponent(eventId)}/lineups`);

    } else if (route === "statistiche" || route === "statistics") {
      if (!eventId) throw new Error("Manca ?id=ID_PARTITA.");
      result = await get(`/event/${encodeURIComponent(eventId)}/statistics`);

    } else if (route === "episodi" || route === "incidents") {
      if (!eventId) throw new Error("Manca ?id=ID_PARTITA.");
      result = await get(`/event/${encodeURIComponent(eventId)}/incidents`);

    } else if (route === "allenatori" || route === "managers") {
      if (!eventId) throw new Error("Manca ?id=ID_PARTITA.");
      result = await get(`/event/${encodeURIComponent(eventId)}/managers`);

    } else if (route === "scontri-diretti" || route === "h2h") {
      if (!eventId) {
        throw new Error("Manca ?id=ID_PARTITA per trovare gli scontri diretti.");
      }
      result = await get(`/event/${encodeURIComponent(eventId)}/h2h`);

    } else if (route === "classifica" || route === "standings") {
      const tournamentId = q.get("tournamentId");
      const seasonId = q.get("seasonId");

      if (!tournamentId || !seasonId) {
        throw new Error(
          "Per la classifica servono ?tournamentId=ID&seasonId=ID. " +
          "Sono ID della competizione e della stagione SofaScore, non ID squadra."
        );
      }

      result = await get(
        `/tournament/${encodeURIComponent(tournamentId)}` +
        `/season/${encodeURIComponent(seasonId)}/standings/total`
      );

    } else if (route === "como" || route.startsWith("como/")) {
      const sub = route.split("/")[1] || "riepilogo";
      const team = TEAMS[q.get("squadra") || "men"] || TEAMS.men;

      if (sub === "primavera") {
        result = await teamSummary(TEAMS.primavera.id);
      } else if (sub === "women") {
        result = await teamSummary(TEAMS.women.id);
      } else if (sub === "partite") {
        result = await teamEvents(team.id, "all", q.get("pages"));
      } else if (sub === "rosa") {
        result = await get(`/team/${team.id}/players`);
      } else {
        result = await teamSummary(team.id);
      }

    } else if (route === "tutto") {
      const pages = q.get("pages") || "3";

      result = {
        source: "SofaScore",
        generatedAt: new Date().toISOString(),
        teams: await Promise.all(
          Object.values(TEAMS).map(async team => ({
            ...team,
            data: await safe(() => teamSummary(team.id, pages))
          }))
        )
      };

    } else {
      return send(res, 404, {
        error: "Endpoint non trovato",
        requested: route,
        endpoints: endpoints()
      });
    }

    return send(res, 200, result);

  } catch (error) {
    const message = String(error?.message || error);

    const status = message.includes("HTTP 403") ? 502
      : message.includes("HTTP 429") ? 503
      : 502;

    return send(res, status, {
      ok: false,
      source: "SofaScore",
      endpoint: route,
      error: message,
      generatedAt: new Date().toISOString(),
      note: message.includes("HTTP 403")
        ? "SofaScore ha rifiutato la richiesta dal server. Il codice non può garantire l'accesso."
        : message.includes("HTTP 429")
        ? "Troppe richieste. Riprova più tardi."
        : "Controlla l'endpoint e la disponibilità della fonte."
    });
  }
}

async function teamSummary(teamId, pages = "3") {
  const results = await Promise.allSettled([
    get(`/team/${teamId}`),
    get(`/team/${teamId}/players`),
    get(`/team/${teamId}/performance`),
    teamEvents(teamId, "all", pages)
  ]);

  return {
    source: "SofaScore",
    teamId,
    generatedAt: new Date().toISOString(),
    profile: value(results[0]),
    players: value(results[1]),
    performance: value(results[2]),
    matches: value(results[3])
  };
}

/*
 * Recupera le pagine disponibili delle partite.
 * pages è limitato a 10 per contenere le richieste.
 * "all" combina eventi passati e futuri senza duplicati.
 */
async function teamEvents(teamId, direction = "all", pages = "3") {
  const maxPages = Math.max(1, Math.min(10, Number(pages) || 3));
  const directions = direction === "all" ? ["last", "next"] : [direction];

  const eventsById = new Map();
  const errors = [];

  for (const dir of directions) {
    for (let page = 0; page < maxPages; page++) {
      try {
        const data = await get(`/team/${teamId}/events/${dir}/${page}`);
        const events = data.events || [];

        if (events.length === 0) break;

        for (const event of events) {
          const id = event.id ?? event.event?.id;
          if (id != null) {
            eventsById.set(String(id), {
              ...event,
              eventId: String(id),
              requestedDirection: dir
            });
          }
        }

        // Piccola pausa tra pagine per limitare il carico sulla fonte.
        await delay(250);

      } catch (error) {
        errors.push({
          direction: dir,
          page,
          error: String(error?.message || error)
        });

        // Se la prima pagina è bloccata, non insistere con altre richieste.
        break;
      }
    }
  }

  const events = [...eventsById.values()].sort((a, b) =>
    Number(a.startTimestamp || a.start_timestamp || 0) -
    Number(b.startTimestamp || b.start_timestamp || 0)
  );

  return {
    source: "SofaScore",
    teamId,
    direction,
    pagesRequestedPerDirection: maxPages,
    count: events.length,
    events,
    errors,
    partial: errors.length > 0,
    generatedAt: new Date().toISOString(),
    note: "Sono incluse le partite restituite dalle pagine richieste. " +
      "Non è garantito che coprano tutta la storia della squadra."
  };
}

async function get(path) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "IlPianetaComasco/1.0"
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} da SofaScore (${path})`);
  }

  return response.json();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safe(fn) {
  try {
    return await fn();
  } catch (error) {
    return {
      error: String(error?.message || error)
    };
  }
}

function value(result) {
  return result.status === "fulfilled"
    ? result.value
    : { error: String(result.reason?.message || result.reason) };
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(data, null, 2));
}

function endpoints() {
  return [
    "/api/health",
    "/api/configurazione",
    "/api/squadre",
    "/api/squadra?teamId=2704",
    "/api/rosa?teamId=2704",
    "/api/forma?teamId=2704",
    "/api/partite?teamId=2704&direction=all&pages=3",
    "/api/ultime?teamId=2704&pages=3",
    "/api/prossime?teamId=2704&pages=3",
    "/api/partita?id=ID_PARTITA",
    "/api/formazioni?id=ID_PARTITA",
    "/api/statistiche?id=ID_PARTITA",
    "/api/episodi?id=ID_PARTITA",
    "/api/allenatori?id=ID_PARTITA",
    "/api/scontri-diretti?id=ID_PARTITA",
    "/api/classifica?tournamentId=ID&seasonId=ID",
    "/api/como",
    "/api/como/primavera",
    "/api/como/women",
    "/api/tutto?pages=3"
  ];
}
