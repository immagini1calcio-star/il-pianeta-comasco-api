import { espnFetch } from "../lib/espn.js";
import { normalizzaPartita } from "../lib/normalizer.js";


const COMPETIZIONI = {

  coppa_italia: {
    nome: "Coppa Italia",
    league: "ita.coppa_italia"
  },

  champions_league: {
    nome: "UEFA Champions League",
    league: "uefa.champions"
  },

  europa_league: {
    nome: "UEFA Europa League",
    league: "uefa.europa"
  },

  conference_league: {
    nome: "UEFA Conference League",
    league: "uefa.europa.conf"
  }

};


function contieneComo(event) {

  const competitors =
    event?.competitions?.[0]?.competitors ||
    [];


  return competitors.some((team) => {

    const nome =
      team.team?.displayName ||
      team.team?.shortDisplayName ||
      team.team?.name ||
      "";


    return nome
      .toLowerCase()
      .includes("como");

  });

}


function trovaTurno(event) {

  const competition =
    event?.competitions?.[0] ||
    {};


  const testi = [

    event?.name,

    event?.shortName,

    event?.season?.displayName,

    event?.season?.slug,

    competition?.type?.text,

    competition?.type?.abbreviation,

    competition?.type?.name,

    competition?.notes?.[0]?.headline,

    competition?.notes?.[0]?.text

  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();


  if (
    testi.includes("final")
  ) {
    return "Finale";
  }


  if (
    testi.includes("semi") ||
    testi.includes("semifinal")
  ) {
    return "Semifinale";
  }


  if (
    testi.includes("quarter") ||
    testi.includes("quarti")
  ) {
    return "Quarti di finale";
  }


  if (
    testi.includes("round of 16") ||
    testi.includes("round of sixteen") ||
    testi.includes("ottavi")
  ) {
    return "Ottavi di finale";
  }


  if (
    testi.includes("round of 32") ||
    testi.includes("trentaduesimi")
  ) {
    return "Sedicesimi / turno precedente";
  }


  return (
    competition?.type?.text ||
    competition?.type?.name ||
    null
  );

}


function trovaAndataRitorno(event) {

  const testo = [

    event?.name,

    event?.shortName,

    event?.competitions?.[0]?.notes?.[0]?.headline,

    event?.competitions?.[0]?.notes?.[0]?.text

  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();


  if (
    testo.includes("2nd leg") ||
    testo.includes("second leg") ||
    testo.includes("ritorno")
  ) {
    return "ritorno";
  }


  if (
    testo.includes("1st leg") ||
    testo.includes("first leg") ||
    testo.includes("andata")
  ) {
    return "andata";
  }


  return null;

}


function normalizzaCoppa(
  event,
  competizione
) {

  const partita =
    normalizzaPartita(
      event
    );


  return {

    id:
      partita.id,

    competizione: {

      nome:
        competizione.nome,

      league:
        competizione.league

    },


    turno:
      trovaTurno(
        event
      ),


    fase:
      trovaAndataRitorno(
        event
      ),


    partita,


    dati_originali:
      event

  };

}


export default async function handler(
  req,
  res
) {

  try {

    // ========================================
    // PARAMETRI
    // ========================================

    const {

      competizione = "coppa_italia",

      dates,

      stagione

    } = req.query;


    // ========================================
    // CONTROLLO COMPETIZIONE
    // ========================================

    const configurazione =
      COMPETIZIONI[
        competizione
      ];


    if (!configurazione) {

      return res.status(400).json({

        success: false,

        error:
          "Competizione non supportata",

        competizioni_disponibili:
          Object.keys(
            COMPETIZIONI
          )

      });

    }


    // ========================================
    // SCOREBOARD ESPN
    // ========================================

    const params = {

      dates

    };


    if (stagione) {

      params.season =
        stagione;

    }


    const data =
      await espnFetch(

        configurazione.league,

        "scoreboard",

        params

      );


    // ========================================
    // EVENTI
    // ========================================

    const eventi =
      data?.events ||
      [];


    // ========================================
    // SOLO COMO
    // ========================================

    const eventiComo =
      eventi.filter(
        contieneComo
      );


    // ========================================
    // NORMALIZZAZIONE
    // ========================================

    const partite =
      eventiComo.map(
        (event) =>
          normalizzaCoppa(
            event,
            configurazione
          )
      );


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source: "ESPN",


      competizione: {

        codice:
          competizione,

        nome:
          configurazione.nome,

        league:
          configurazione.league

      },


      stagione:
        stagione ||
        null,


      totale:
        partite.length,


      partite,


      // ======================================
      // DATI ORIGINALI SCOREBOARD
      // ======================================

      dati_originali:
        data

    });


  } catch (error) {

    console.error(
      "Errore API coppe:",
      error
    );


    res.status(500).json({

      success: false,

      source: "ESPN",

      error:
        error?.message ||
        "Errore sconosciuto"

    });

  }

    }
