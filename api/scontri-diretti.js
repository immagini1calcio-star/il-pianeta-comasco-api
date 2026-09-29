import { espnFetch } from "../lib/espn.js";


// ============================================
// NORMALIZZA UNA PARTITA
// ============================================

function normalizzaPartita(event, teamId) {
  const competition =
    event?.competitions?.[0];

  const competitors =
    competition?.competitors || [];

  const casa =
    competitors.find(
      (team) =>
        team.homeAway === "home"
    );

  const trasferta =
    competitors.find(
      (team) =>
        team.homeAway === "away"
    );

  if (!casa || !trasferta) {
    return null;
  }

  const teamCasa =
    String(casa.team?.id) ===
    String(teamId);

  const avversario =
    teamCasa
      ? trasferta
      : casa;

  return {
    id:
      event.id ||
      null,

    data:
      event.date ||
      null,

    competizione: {
      nome:
        event.league?.name ||
        competition?.name ||
        null,

      abbreviazione:
        event.league?.abbreviation ||
        null,

      stagione:
        event.season?.displayName ||
        null
    },

    casa: {
      id:
        casa.team?.id ||
        null,

      nome:
        casa.team?.displayName ||
        null,

      abbreviazione:
        casa.team?.abbreviation ||
        null,

      logo:
        casa.team?.logo ||
        null,

      gol:
        casa.score ??
        null
    },

    trasferta: {
      id:
        trasferta.team?.id ||
        null,

      nome:
        trasferta.team?.displayName ||
        null,

      abbreviazione:
        trasferta.team?.abbreviation ||
        null,

      logo:
        trasferta.team?.logo ||
        null,

      gol:
        trasferta.score ??
        null
    },

    risultato: {
      casa:
        casa.score ??
        null,

      trasferta:
        trasferta.score ??
        null
    },

    avversario: {
      id:
        avversario.team?.id ||
        null,

      nome:
        avversario.team?.displayName ||
        null
    },

    originale:
      event
  };
}


// ============================================
// TROVA SCONTRI DIRETTI
// ============================================

function trovaScontriDiretti(
  eventi,
  teamId,
  avversarioId
) {
  return (eventi || [])
    .filter((event) => {

      const competitors =
        event?.competitions?.[0]
          ?.competitors ||
        [];

      const ids =
        competitors.map(
          (team) =>
            String(team.team?.id)
        );

      return (
        ids.includes(
          String(teamId)
        ) &&
        ids.includes(
          String(avversarioId)
        )
      );
    })
    .map(
      (event) =>
        normalizzaPartita(
          event,
          teamId
        )
    )
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.data) -
        new Date(a.data)
    );
}


// ============================================
// HANDLER
// ============================================

export default async function handler(
  req,
  res
) {

  try {

    const {
      id,
      league = "ita.1",
      limite = "10"
    } = req.query;


    // ========================================
    // ID PARTITA OBBLIGATORIO
    // ========================================

    if (!id) {

      return res.status(400).json({
        success: false,
        source: "ESPN",
        error:
          "Parametro id partita mancante"
      });

    }


    // ========================================
    // RECUPERA LA PARTITA
    // ========================================

    const summary =
      await espnFetch(
        league,
        "summary",
        {
          event: id
        }
      );


    const competition =
      summary
        ?.header
        ?.competitions?.[0];


    const competitors =
      competition
        ?.competitors ||
      [];


    const casa =
      competitors.find(
        (team) =>
          team.homeAway === "home"
      );


    const trasferta =
      competitors.find(
        (team) =>
          team.homeAway === "away"
      );


    if (
      !casa ||
      !trasferta
    ) {

      return res.status(404).json({
        success: false,
        source: "ESPN",
        error:
          "Squadre della partita non trovate"
      });

    }


    const casaId =
      casa.team?.id ||
      null;


    const trasfertaId =
      trasferta.team?.id ||
      null;


    // ========================================
    // RECUPERA I CALENDARI DELLE DUE SQUADRE
    // ========================================

    const [
      calendarioCasa,
      calendarioTrasferta
    ] =
      await Promise.all([

        espnFetch(
          league,
          `teams/${casaId}/schedule`
        ),

        espnFetch(
          league,
          `teams/${trasfertaId}/schedule`
        )

      ]);


    const eventiCasa =
      calendarioCasa?.events ||
      [];


    const eventiTrasferta =
      calendarioTrasferta?.events ||
      [];


    // ========================================
    // CERCA GLI SCONTRI DIRETTI
    // ========================================

    let scontri =
      trovaScontriDiretti(
        eventiCasa,
        casaId,
        trasfertaId
      );


    // ========================================
    // FALLBACK:
    // SE IL CALENDARIO CASA NON CONTIENE
    // TUTTI GLI SCONTRI, USA QUELLO TRASFERTA
    // ========================================

    if (
      scontri.length === 0
    ) {

      scontri =
        trovaScontriDiretti(
          eventiTrasferta,
          trasfertaId,
          casaId
        );

    }


    // ========================================
    // RIMUOVE EVENTUALI DUPLICATI
    // ========================================

    const mappa =
      new Map();


    for (
      const partita
      of scontri
    ) {

      if (
        partita?.id
      ) {

        mappa.set(
          partita.id,
          partita
        );

      }

    }


    scontri =
      Array.from(
        mappa.values()
      )
      .sort(
        (a, b) =>
          new Date(b.data) -
          new Date(a.data)
      );


    // ========================================
    // LIMITE
    // ========================================

    const numero =
      Math.max(
        1,
        Math.min(
          Number(limite) ||
            10,
          50
        )
      );


    const risultati =
      scontri.slice(
        0,
        numero
      );


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source:
        "ESPN",

      league,

      partita: {

        id,

        casa: {
          id:
            casaId,

          nome:
            casa.team?.displayName ||
            null,

          logo:
            casa.team?.logo ||
            null
        },

        trasferta: {
          id:
            trasfertaId,

          nome:
            trasferta.team?.displayName ||
            null,

          logo:
            trasferta.team?.logo ||
            null
        }

      },

      totale:
        risultati.length,

      scontri_diretti:
        risultati,

      dati_originali: {
        calendario_casa:
          calendarioCasa,

        calendario_trasferta:
          calendarioTrasferta
      }

    });

  } catch (error) {

    console.error(
      "Errore API scontri diretti:",
      error
    );


    res.status(500).json({

      success: false,

      source:
        "ESPN",

      error:
        error?.message ||
        "Errore sconosciuto"

    });

  }

            }
