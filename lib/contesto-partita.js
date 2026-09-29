import {
  espnFetch,
  espnCoreFetch
} from "./espn.js";


// ==========================================
// NORMALIZZA UNA SQUADRA
// ==========================================

function normalizzaSquadra(team) {

  return {

    id:
      team?.id ||
      team?.team?.id ||
      null,

    nome:
      team?.displayName ||
      team?.team?.displayName ||
      null,

    nome_breve:
      team?.shortDisplayName ||
      team?.team?.shortDisplayName ||
      null,

    abbreviazione:
      team?.abbreviation ||
      team?.team?.abbreviation ||
      null,

    logo:
      team?.logo ||
      team?.team?.logo ||
      null

  };

}


// ==========================================
// NORMALIZZA UNA PARTITA DEL CALENDARIO
// ==========================================

function normalizzaPartitaCalendario(event) {

  const competition =
    event?.competitions?.[0];

  const competitors =
    competition?.competitors || [];

  const home =
    competitors.find(
      team => team.homeAway === "home"
    );

  const away =
    competitors.find(
      team => team.homeAway === "away"
    );


  return {

    id:
      event?.id ||
      null,

    data:
      event?.date ||
      null,

    nome:
      event?.name ||
      null,

    stato:
      competition?.status?.type?.name ||
      event?.status?.type?.name ||
      null,

    stato_descrizione:
      competition?.status?.type?.description ||
      event?.status?.type?.description ||
      null,

    casa: {

      id:
        home?.team?.id ||
        null,

      nome:
        home?.team?.displayName ||
        null,

      logo:
        home?.team?.logo ||
        null,

      punteggio:
        home?.score ??
        null

    },

    trasferta: {

      id:
        away?.team?.id ||
        null,

      nome:
        away?.team?.displayName ||
        null,

      logo:
        away?.team?.logo ||
        null,

      punteggio:
        away?.score ??
        null

    },

    competizione: {

      nome:
        event?.league?.name ||
        null,

      abbreviazione:
        event?.league?.abbreviation ||
        null

    }

  };

}


// ==========================================
// PARTITE TERMINATE
// ==========================================

function partiteTerminate(events) {

  return events

    .map(normalizzaPartitaCalendario)

    .filter(partita => {

      const stato =
        String(
          partita.stato || ""
        ).toLowerCase();

      return (
        stato.includes("post") ||
        stato.includes("final") ||
        stato.includes("completed")
      );

    })

    .sort(
      (a, b) =>
        new Date(b.data) -
        new Date(a.data)
    );

}


// ==========================================
// ULTIMA PARTITA
// ==========================================

function ultimaPartita(events) {

  const terminate =
    partiteTerminate(events);

  return terminate[0] || null;

}


// ==========================================
// ULTIME 5 PARTITE
// ==========================================

function ultimeCinquePartite(events) {

  const terminate =
    partiteTerminate(events);

  return terminate
    .slice(0, 5)
    .map(partita => {

      const casa =
        partita.casa;

      const trasferta =
        partita.trasferta;


      let risultato =
        null;


      if (
        casa.punteggio !== null &&
        trasferta.punteggio !== null
      ) {

        const casaScore =
          Number(casa.punteggio);

        const trasfertaScore =
          Number(trasferta.punteggio);


        if (
          casaScore ===
          trasfertaScore
        ) {

          risultato = "P";

        }

      }


      return {

        ...partita,

        risultato

      };

    });

}


// ==========================================
// ALLENATORE
// ==========================================

function estraiAllenatori(teamData) {

  const coaches =
    teamData?.team?.coaches ||
    teamData?.coaches ||
    [];


  return coaches.map(coach => {

    const persona =
      coach?.coach ||
      coach;


    return {

      id:
        persona?.id ||
        null,

      nome:
        persona?.displayName ||
        persona?.fullName ||
        persona?.shortName ||
        null,

      ruolo:
        coach?.role?.displayName ||
        coach?.role?.name ||
        coach?.role?.abbreviation ||
        null,

      foto:
        persona?.headshot?.href ||
        null

    };

  });

}


// ==========================================
// ARBITRI
// ==========================================

async function estraiArbitri(
  league,
  eventId,
  competitionId
) {

  try {

    const data =
      await espnCoreFetch(
        league,
        `events/${eventId}/competitions/${competitionId}/officials`
      );


    const items =
      data?.items ||
      data?.officials ||
      [];


    return items.map(item => {

      const official =
        item?.official ||
        item;


      return {

        id:
          official?.id ||
          null,

        nome:
          official?.displayName ||
          official?.fullName ||
          official?.shortName ||
          null,

        ruolo:
          item?.role?.displayName ||
          item?.role?.name ||
          item?.role?.abbreviation ||
          null,

        nazionalita:
          official?.nationality ||
          null,

        foto:
          official?.headshot?.href ||
          null

      };

    });

  } catch (error) {

    console.error(
      "Errore recupero arbitri:",
      error.message
    );

    return [];

  }

}


// ==========================================
// STADIO
// ==========================================

function estraiStadio(summary) {

  const competition =
    summary?.header?.competitions?.[0];


  const venue =
    competition?.venue ||
    summary?.gameInfo?.venue ||
    null;


  return {

    id:
      venue?.id ||
      null,

    nome:
      venue?.fullName ||
      venue?.name ||
      null,

    citta:
      venue?.address?.city ||
      null,

    stato:
      venue?.address?.country ||
      null,

    capacita:
      venue?.capacity ||
      null

  };

}


// ==========================================
// CLASSIFICA
// ==========================================

function estraiClassificaTeam(
  standingsData,
  teamId
) {

  const gruppi =
    standingsData?.children ||
    [];


  for (const gruppo of gruppi) {

    const entries =
      gruppo?.standings?.entries ||
      [];


    const trovato =
      entries.find(entry => {

        const id =
          entry?.team?.id ||
          entry?.team?.uid?.split(":").pop();


        return String(id) ===
          String(teamId);

      });


    if (trovato) {

      return {

        posizione:
          trovato?.stats?.find(
            stat =>
              stat.name === "rank"
          )?.value ??
          trovato?.note?.rank ??
          null,

        punti:
          trovato?.stats?.find(
            stat =>
              stat.name === "points"
          )?.value ??
          null,

        partite:
          trovato?.stats?.find(
            stat =>
              stat.name === "gamesPlayed"
          )?.value ??
          null,

        vittorie:
          trovato?.stats?.find(
            stat =>
              stat.name === "wins"
          )?.value ??
          null,

        pareggi:
          trovato?.stats?.find(
            stat =>
              stat.name === "ties" ||
              stat.name === "draws"
          )?.value ??
          null,

        sconfitte:
          trovato?.stats?.find(
            stat =>
              stat.name === "losses"
          )?.value ??
          null,

        gol_fatti:
          trovato?.stats?.find(
            stat =>
              stat.name === "pointsFor" ||
              stat.name === "goalsFor"
          )?.value ??
          null,

        gol_subiti:
          trovato?.stats?.find(
            stat =>
              stat.name === "pointsAgainst" ||
              stat.name === "goalsAgainst"
          )?.value ??
          null

      };

    }

  }


  return null;

}


// ==========================================
// FUNZIONE PRINCIPALE
// ==========================================

export async function creaContestoPartita(
  league,
  eventId,
  summary,
  homeId,
  awayId
) {

  const competitionId =
    summary?.header?.competitions?.[0]?.id ||
    eventId;


  // ========================================
  // RECUPERO DATI
  // ========================================

  const risultati =
    await Promise.allSettled([

      espnFetch(
        league,
        `teams/${homeId}`
      ),

      espnFetch(
        league,
        `teams/${awayId}`
      ),

      espnFetch(
        league,
        `teams/${homeId}/schedule`
      ),

      espnFetch(
        league,
        `teams/${awayId}/schedule`
      ),

      espnFetch(
        league,
        "standings"
      ),

      estraiArbitri(
        league,
        eventId,
        competitionId
      )

    ]);


  const homeTeam =
    risultati[0].status === "fulfilled"
      ? risultati[0].value
      : null;


  const awayTeam =
    risultati[1].status === "fulfilled"
      ? risultati[1].value
      : null;


  const homeSchedule =
    risultati[2].status === "fulfilled"
      ? risultati[2].value
      : null;


  const awaySchedule =
    risultati[3].status === "fulfilled"
      ? risultati[3].value
      : null;


  const standings =
    risultati[4].status === "fulfilled"
      ? risultati[4].value
      : null;


  const arbitri =
    risultati[5].status === "fulfilled"
      ? risultati[5].value
      : [];


  // ========================================
  // CALENDARI
  // ========================================

  const homeEvents =
    homeSchedule?.events ||
    [];


  const awayEvents =
    awaySchedule?.events ||
    [];


  // ========================================
  // ULTIME PARTITE
  // ========================================

  const homeUltima =
    ultimaPartita(
      homeEvents
    );


  const awayUltima =
    ultimaPartita(
      awayEvents
    );


  const homeUltime5 =
    ultimeCinquePartite(
      homeEvents
    );


  const awayUltime5 =
    ultimeCinquePartite(
      awayEvents
    );


  // ========================================
  // RITORNO COMPLETO
  // ========================================

  return {

    allenatori: {

      casa:
        estraiAllenatori(
          homeTeam
        ),

      trasferta:
        estraiAllenatori(
          awayTeam
        )

    },


    arbitri,


    stadio:
      estraiStadio(
        summary
      ),


    classifica: {

      casa:
        estraiClassificaTeam(
          standings,
          homeId
        ),

      trasferta:
        estraiClassificaTeam(
          standings,
          awayId
        )

    },


    ultime_partite: {

      casa: {

        ultima:
          homeUltima,

        ultime_5:
          homeUltime5

      },

      trasferta: {

        ultima:
          awayUltima,

        ultime_5:
          awayUltime5

      }

    }

  };

    }
