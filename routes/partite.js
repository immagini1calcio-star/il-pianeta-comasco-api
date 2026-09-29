import { espnFetch } from "../lib/espn.js";
import { normalizzaPartita } from "../lib/normalizer.js";
import { trovaComo } from "../lib/como.js";


function normalizzaEvento(event) {

  const partita =
    normalizzaPartita(event);


  const competition =
    event?.competitions?.[0] ||
    {};


  return {

    ...partita,


    // ========================================
    // INFORMAZIONI EXTRA
    // ========================================

    settimana:
      event?.week?.number ||
      null,

    turno:
      event?.season?.type?.text ||
      event?.season?.type?.name ||
      null,

    stato_dettagliato:
      competition?.status ||
      null,


    // ========================================
    // STADIO
    // ========================================

    stadio: {

      nome:
        competition?.venue?.fullName ||
        null,

      citta:
        competition?.venue?.address?.city ||
        null,

      paese:
        competition?.venue?.address?.country ||
        null,

      capacita:
        competition?.venue?.capacity ||
        null

    },


    // ========================================
    // COMPETIZIONE COMPLETA
    // ========================================

    competizione: {

      nome:
        event?.league?.name ||
        competition?.league?.name ||
        null,

      abbreviazione:
        event?.league?.abbreviation ||
        competition?.league?.abbreviation ||
        null,

      stagione:
        event?.season?.displayName ||
        null

    },


    // ========================================
    // DATI ORIGINALI
    // ========================================

    dati_originali:
      event

  };

}


function contieneComo(event, comoId) {

  const competitors =
    event?.competitions?.[0]?.competitors ||
    [];


  return competitors.some(
    (team) => {

      const teamId =
        team?.team?.id ||
        team?.id ||
        null;


      return (
        teamId &&
        String(teamId) ===
        String(comoId)
      );

    }
  );

}


export default async function handler(
  req,
  res
) {

  try {

    // ========================================
    // TROVA COMO
    // ========================================

    const como =
      await trovaComo();


    const comoId =
      como.id;


    // ========================================
    // PARAMETRI
    // ========================================

    const {
      dates,
      stagione,
      league
    } = req.query;


    // ========================================
    // LEGA
    // ========================================

    const lega =
      league ||
      "ita.1";


    // ========================================
    // RECUPERA CALENDARIO COMO
    // ========================================

    const params = {};


    if (dates) {

      params.dates =
        dates;

    }


    if (stagione) {

      params.season =
        stagione;

    }


    const data =
      await espnFetch(
        lega,
        `teams/${comoId}/schedule`,
        params
      );


    // ========================================
    // EVENTI
    // ========================================

    const eventi =
      data?.events ||
      [];


    // ========================================
    // FILTRO COMO
    // ========================================

    const eventiComo =
      eventi.filter(
        (event) =>
          contieneComo(
            event,
            comoId
          )
      );


    // ========================================
    // NORMALIZZAZIONE
    // ========================================

    const partite =
      eventiComo.map(
        normalizzaEvento
      );


    // ========================================
    // ORDINAMENTO TEMPORALE
    // ========================================

    partite.sort(
      (a, b) => {

        const dataA =
          a.data
            ? new Date(a.data).getTime()
            : 0;

        const dataB =
          b.data
            ? new Date(b.data).getTime()
            : 0;


        return dataA - dataB;

      }
    );


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source: "ESPN",


      squadra: {

        id:
          como.id ||
          null,

        nome:
          como.displayName ||
          null,

        nome_breve:
          como.shortDisplayName ||
          null,

        abbreviazione:
          como.abbreviation ||
          null,

        logo:
          como.logos?.[0]?.href ||
          null

      },


      league:
        lega,


      stagione:
        stagione ||
        null,


      totale:
        partite.length,


      partite,


      dati_originali:
        data

    });


  } catch (error) {

    console.error(
      "Errore API partite:",
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
