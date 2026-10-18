
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";

const COMPETIZIONI = {
  "ita.1": "Serie A",
  "ita.coppa_italia": "Coppa Italia",
  "uefa.champions": "Champions League",
  "uefa.europa": "Europa League",
  "uefa.europa.conf": "Conference League"
};

function risposta(res, status, dati) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.end(JSON.stringify(dati, null, 2));
}

async function recupera(url) {
  const r = await fetch(url);
  const testo = await r.text();

  let dati;
  try {
    dati = JSON.parse(testo);
  } catch {
    throw new Error("La fonte non ha restituito JSON valido.");
  }

  if (!r.ok) {
    throw new Error(`Errore ESPN ${r.status}: ${r.statusText}`);
  }

  return dati;
}

function urlESPN(league, risorsa, parametri = {}, v2 = false) {
  const base = v2 ? ESPN_V2 : ESPN;
  const url = new URL(`${base}/${league}/${risorsa}`);

  for (const [chiave, valore] of Object.entries(parametri)) {
    if (valore !== undefined && valore !== null && valore !== "") {
      url.searchParams.set(chiave, String(valore));
    }
  }

  return url.toString();
}

function squadra(t = {}) {
  return {
    id: t.id ?? null,
    nome: t.displayName ?? t.name ?? null,
    abbreviazione: t.abbreviation ?? null,
    logo: t.logo ?? t.logos?.[0]?.href ?? null
  };
}

function normalizzaPartita(e = {}) {
  const competizione = e.competitions?.[0] || {};
  const squadre = competizione.competitors || e.competitors || [];

  const casa = squadre.find(x => x.homeAway === "home") || {};
  const ospite = squadre.find(x => x.homeAway === "away") || {};

  const nomeCasa = squadra(casa.team || casa);
  const nomeOspite = squadra(ospite.team || ospite);

  const golCasa = casa.score ?? null;
  const golOspite = ospite.score ?? null;

  return {
    id: e.id ?? null,
    data_ora: e.date ?? competizione.date ?? null,
    competizione: e.league?.name ?? e.season?.name ?? null,
    partita: e.name ?? `${nomeCasa.nome || "Casa"} - ${nomeOspite.nome || "Ospite"}`,
    stato: e.status?.type?.description ?? competizione.status?.type?.description ?? null,
    casa: { ...nomeCasa, gol: golCasa },
    ospite: { ...nomeOspite, gol: golOspite },
    risultato: golCasa !== null && golOspite !== null
      ? `${golCasa}-${golOspite}`
      : null,
    stadio: competizione.venue?.fullName ?? null,
    arbitri: (competizione.officials || []).map(x => x.fullName).filter(Boolean),
    fonte: "ESPN"
  };
}

function eventiDa(dati) {
  return dati.events || dati.leagues?.[0]?.events || dati.schedule || [];
}

async function trovaSquadre(league) {
  const dati = await recupera(urlESPN(league, "teams"));

  const leghe = [
    ...(dati.sports || []).flatMap(s => s.leagues || []),
    ...(dati.leagues || [])
  ];

  return leghe
    .flatMap(l => l.teams || [])
    .map(x => squadra(x.team || x));
}

async function trovaComo(league) {
  const squadre = await trovaSquadre(league);
  return squadre.find(s =>
    `${s.nome || ""} ${s.abbreviazione || ""}`.toLowerCase().includes("como")
  ) || null;
}

async function calendario(league, id) {
  const dati = await recupera(urlESPN(league, `teams/${id}/schedule`));
  return (dati.events || dati.schedule || []).map(normalizzaPartita);
}

async function rosa(league, id) {
  const dati = await recupera(urlESPN(league, `teams/${id}/roster`));
  const gruppi = dati.athletes || dati.roster || [];

  return gruppi.flatMap(g => Array.isArray(g.items) ? g.items : [g])
    .filter(Boolean)
    .map(a => ({
      id: a.id ?? null,
      nome: a.fullName ?? a.displayName ?? null,
      nome_breve: a.shortName ?? null,
      foto: a.headshot?.href ?? null,
      numero: a.jersey ?? null,
      ruolo: a.position?.displayName ?? a.position?.abbreviation ?? null,
      nazionalita: a.citizenship ?? null,
      data_nascita: a.dateOfBirth ?? null,
      altezza: a.displayHeight ?? null,
      peso: a.displayWeight ?? null
    }));
}

async function riepilogoPartita(league, id) {
  const dati = await recupera(urlESPN(league, "summary", { event: id }));
  const box = dati.boxscore || {};

  return {
    intestazione: dati.header ?? null,
    eventi: (dati.plays || []).map(p => ({
      minuto: p.clock?.displayValue ?? null,
      tipo: p.type?.text ?? null,
      descrizione: p.text ?? null,
      squadra: p.team?.displayName ?? null,
      giocatori: (p.participants || []).map(x => ({
        nome: x.athlete?.displayName ?? null,
        ruolo: x.type?.text ?? null
      }))
    })),
    statistiche_squadre: (box.teams || []).map(t => ({
      squadra: squadra(t.team || {}),
      statistiche: (t.statistics || []).map(s => ({
        nome: s.name ?? s.abbreviation ?? null,
        etichetta: s.label ?? null,
        valore: s.displayValue ?? s.value ?? null
      }))
    })),
    giocatori: box.players || [],
    formazioni: box.players || [],
    dati_originali: dati
  };
}

export default async function handler(req, res) {
  const percorso = (req.url || "/").split("?")[0]
    .replace(/^\/api\/?/, "")
    .replace(/\/$/, "");

  const q = req.query || {};
  const league = String(q.league || "ita.1");

  try {
    if (percorso === "" || percorso === "health") {
      return risposta(res, 200, {
        success: true,
        progetto: "Il Pianeta Comasco",
        versione: "2.0.0",
        stato: "online",
        endpoints: [
          "/api/squadre?league=ita.1",
          "/api/como-team?league=ita.1",
          "/api/partite?league=ita.1",
          "/api/giocatori?league=ita.1",
          "/api/classifica?league=ita.1",
          "/api/partita?id=ID_ESPN&league=ita.1",
          "/api/indisponibili?league=ita.1",
          "/api/coppe"
        ]
      });
    }

    if (percorso === "configurazione") {
      return risposta(res, 200, {
        success: true,
        progetto: "Il Pianeta Comasco",
        fonti: ["ESPN"],
        competizioni: COMPETIZIONI,
        squadre_previste: [
          "Como prima squadra maschile",
          "Como Primavera",
          "Como prima squadra femminile"
        ],
        nota: "La disponibilità dei dati dipende dalla copertura ESPN. I dati non forniti dalla fonte non possono essere ricostruiti con certezza."
      });
    }

    if (percorso === "squadre") {
      const squadre = await trovaSquadre(league);
      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        totale: squadre.length, squadre
      });
    }

    if (percorso === "como-team") {
      const como = await trovaComo(league);
      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        trovato: !!como, squadra: como
      });
    }

    if (percorso === "partite") {
      const como = await trovaComo(league);

      if (!como) {
        return risposta(res, 200, {
          success: true, league, partite: [],
          avviso: "Como non trovato in questa competizione. Controlla /api/squadre."
        });
      }

      const partite = await calendario(league, como.id);
      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        squadra: como, totale: partite.length, partite
      });
    }

    if (percorso === "scoreboard") {
      const parametri = q.dates ? { dates: q.dates } : {};
      const dati = await recupera(urlESPN(league, "scoreboard", parametri));
      const partite = eventiDa(dati).map(normalizzaPartita);

      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        totale: partite.length, partite
      });
    }

    if (percorso === "giocatori") {
      const como = q.teamId
        ? { id: String(q.teamId) }
        : await trovaComo(league);

      if (!como) {
        return risposta(res, 200, {
          success: true, giocatori: [],
          errore: "Squadra non trovata. Consulta /api/squadre."
        });
      }

      const giocatori = await rosa(league, como.id);
      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        squadra: como, totale: giocatori.length, giocatori
      });
    }

    if (percorso === "classifica") {
      const dati = await recupera(urlESPN(league, "standings", {}, true));
      const leghe = dati.children || [];
      const voci = leghe.flatMap(c => c.standings?.entries || []);
      const classifica = voci.map(e => ({
        squadra: squadra(e.team || {}),
        statistiche: (e.stats || []).map(s => ({
          nome: s.name ?? s.abbreviation ?? null,
          etichetta: s.displayName ?? s.name ?? null,
          valore: s.displayValue ?? s.value ?? null
        }))
      }));

      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        totale: classifica.length, classifica,
        nota: classifica.length ? null : "La fonte non ha restituito voci per questa classifica."
      });
    }

    if (percorso === "indisponibili") {
      const como = q.teamId
        ? { id: String(q.teamId) }
        : await trovaComo(league);

      if (!como) {
        return risposta(res, 200, {
          success: true, indisponibili: [],
          errore: "Squadra non trovata."
        });
      }

      const dati = await recupera(urlESPN(league, `teams/${como.id}/injuries`));
      const lista = dati.items || dati.injuries || [];

      return risposta(res, 200, {
        success: true, fonte: "ESPN", league,
        indisponibili: lista.map(x => ({
          giocatore: x.athlete?.displayName ?? null,
          stato: x.status ?? x.type?.description ?? null,
          dettaglio: x.details?.detail ?? null,
          data_rientro: x.details?.returnDate ?? null
        }))
      });
    }

    if (percorso === "partita" || percorso === "formazioni") {
      const id = String(q.id || q.event || "");

      if (!id) {
        return risposta(res, 400, {
          success: false,
          errore: "Manca il parametro id. Esempio: /api/partita?id=123456&league=ita.1"
        });
      }

      const dati = await riepilogoPartita(league, id);

      if (percorso === "formazioni") {
        return risposta(res, 200, {
          success: true, fonte: "ESPN", league, id,
          formazioni: dati.formazioni,
          nota: "ESPN non fornisce le formazioni per ogni partita."
        });
      }

      return risposta(res, 200, {
        success: true, fonte: "ESPN", league, id, ...dati
      });
    }

    if (percorso === "coppe") {
      const competizioni = {};

      for (const [id, nome] of Object.entries(COMPETIZIONI)) {
        try {
          const dati = await recupera(urlESPN(id, "scoreboard"));
          const partite = eventiDa(dati).map(normalizzaPartita);
          competizioni[id] = {
            nome, totale: partite.length,
            partite_como: partite.filter(p =>
              `${p.casa.nome || ""} ${p.ospite.nome || ""}`.toLowerCase().includes("como")
            )
          };
        } catch (e) {
          competizioni[id] = {
            nome, totale: 0, partite_como: [],
            errore: e.message
          };
        }
      }

      return risposta(res, 200, {
        success: true, fonte: "ESPN", competizioni
      });
    }

    if (percorso === "scontri-diretti") {
      const { team1, team2 } = q;

      if (!team1 || !team2) {
        return risposta(res, 400, {
          success: false,
          errore: "Servono team1 e team2 con gli ID ESPN delle squadre."
        });
      }

      const [a, b] = await Promise.all([
        recupera(urlESPN(league, `teams/${team1}/schedule`)),
        recupera(urlESPN(league, `teams/${team2}/schedule`))
      ]);

      const bIds = new Set((b.events || b.schedule || []).map(e => String(e.id)));
      const partite = (a.events || a.schedule || [])
        .filter(e => bIds.has(String(e.id)))
        .map(normalizzaPartita)
        .sort((x, y) => String(y.data_ora).localeCompare(String(x.data_ora)));

      return risposta(res, 200, {
        success: true, fonte: "ESPN",
        totale: partite.length, scontri_diretti: partite
      });
    }

    return risposta(res, 404, {
      success: false,
      errore: "Endpoint non trovato",
      percorso
    });
  } catch (e) {
    console.error("Errore API:", e);

    return risposta(res, 502, {
      success: false,
      errore: e.message || "Errore sconosciuto",
      percorso, league,
      suggerimento: "Prova /api/squadre?league=ita.1 per verificare la risposta ESPN."
    });
  }
}
