import { espnFetch, espnCoreFetch } from "../lib/espn.js";

import {
  normalizzaEventi,
  separaEventi
} from "../lib/partita.js";

import {
  estraiDatiTecnici
} from "../lib/statistiche.js";

import {
  normalizzaStatisticheSquadra,
  creaStatistichePartita
} from "../lib/statistiche-partita.js";

import {
  normalizzaFormazioni
} from "../lib/formazioni.js";

import {
  creaContestoPartita
} from "../lib/contesto-partita.js";


export default async function handler(req, res) {

  try {

    const {
      league = "ita.1",
      id
    } = req.query;


    // ==========================================
    // CONTROLLO ID
    // ==========================================

    if (!id) {

      return res.status(400).json({
        success: false,
        error: "Parametro id mancante"
      });

    }


    // ==========================================
    // SUMMARY ESPN
    // ==========================================

    const summary =
      await espnFetch(
        league,
        "summary",
        {
          event: id
        }
      );


    // ==========================================
    // COMPETIZIONE
    // ==========================================

    const competition =
      summary?.header?.competitions?.[0];


    const competitors =
      competition?.competitors || [];


    const home =
      competitors.find(
        team =>
          team.homeAway === "home"
      );


    const away =
      competitors.find(
        team =>
          team.homeAway === "away"
      );


    // ==========================================
    // ID SQUADRE
    // ==========================================

    const homeId =
      home?.team?.id ||
      home?.id ||
      null;


    const awayId =
      away?.team?.id ||
      away?.id ||
      null;


    // ==========================================
    // EVENTI
    // ==========================================

    const eventi =
      normalizzaEventi(
        summary
      );


    const eventiSeparati =
      separaEventi(
        eventi
      );


    // ==========================================
    // DATI TECNICI
    // ==========================================

    const datiTecnici =
      estraiDatiTecnici(
        summary
      );


    // ==========================================
    // FORMAZIONI
    // ==========================================

    const formazioni =
      normalizzaFormazioni(
        summary
      );


    // ==========================================
    // STATISTICHE SQUADRE
    // ==========================================

    let statisticheCasa = [];

    let statisticheTrasferta = [];


    // ==========================================
    // STATISTICHE CASA
    // ==========================================

    if (home?.id) {

      try {

        const dataCasa =
          await espnCoreFetch(
            league,
            `events/${id}/competitions/${id}/competitors/${home.id}/statistics`
          );


        statisticheCasa =
          normalizzaStatisticheSquadra(
            dataCasa
          );

      } catch (error) {

        console.error(
          "Errore statistiche casa:",
          error.message
        );

      }

    }


    // ==========================================
    // STATISTICHE TRASFERTA
    // ==========================================

    if (away?.id) {

      try {

        const dataTrasferta =
          await espnCoreFetch(
            league,
            `events/${id}/competitions/${id}/competitors/${away.id}/statistics`
          );


        statisticheTrasferta =
          normalizzaStatisticheSquadra(
            dataTrasferta
          );

      } catch (error) {

        console.error(
          "Errore statistiche trasferta:",
          error.message
        );

      }

    }


    // ==========================================
    // STATISTICHE FINALI
    // ==========================================

    const statistiche =
      creaStatistichePartita(
        statisticheCasa,
        statisticheTrasferta
      );


    // ==========================================
    // CONTESTO PARTITA
    // ==========================================

    let contesto = {

      allenatori: {

        casa: [],

        trasferta: []

      },

      arbitri: [],

      stadio: null,

      classifica: {

        casa: null,

        trasferta: null

      },

      ultime_partite: {

        casa: {

          ultima: null,

          ultime_5: []

        },

        trasferta: {

          ultima: null,

          ultime_5: []

        }

      },

      scontro_diretto: null

    };


    // ==========================================
    // RECUPERO CONTESTO
    // ==========================================

    if (
      homeId &&
      awayId
    ) {

      try {

        contesto =
          await creaContestoPartita(
            league,
            id,
            summary,
            homeId,
            awayId
          );

      } catch (error) {

        console.error(
          "Errore contesto partita:",
          error.message
        );

      }

    }


    // ==========================================
    // RISPOSTA FINALE
    // ==========================================

    res.status(200).json({

      success: true,

      source: "ESPN",

      league,


      // ========================================
      // DATI PRINCIPALI PARTITA
      // ========================================

      partita: {

        id,

        nome:
          competitors
            .map(
              team =>
                team.team?.displayName
            )
            .filter(Boolean)
            .join(" - ") ||
          null,


        data:
          competition?.date ||
          null,


        competizione: {

          nome:
            summary?.header?.league?.name ||
            summary?.header?.competitions?.[0]?.league?.name ||
            null,

          abbreviazione:
            summary?.header?.league?.abbreviation ||
            summary?.header?.competitions?.[0]?.league?.abbreviation ||
            null

        },


        stagione:
          summary?.header?.season?.displayName ||
          null,


        stato:
          competition?.status ||
          null,


        // ======================================
        // CASA
        // ======================================

        casa: {

          id:
            home?.team?.id ||
            home?.id ||
            null,

          nome:
            home?.team?.displayName ||
            null,

          nome_breve:
            home?.team?.shortDisplayName ||
            null,

          abbreviazione:
            home?.team?.abbreviation ||
            null,

          logo:
            home?.team?.logo ||
            null,

          punteggio:
            home?.score ??
            null,

          vincitore:
            home?.winner ??
            null

        },


        // ======================================
        // TRASFERTA
        // ======================================

        trasferta: {

          id:
            away?.team?.id ||
            away?.id ||
            null,

          nome:
            away?.team?.displayName ||
            null,

          nome_breve:
            away?.team?.shortDisplayName ||
            null,

          abbreviazione:
            away?.team?.abbreviation ||
            null,

          logo:
            away?.team?.logo ||
            null,

          punteggio:
            away?.score ??
            null,

          vincitore:
            away?.winner ??
            null

        }

      },


      // ========================================
      // STADIO
      // ========================================

      stadio:
        contesto.stadio,


      // ========================================
      // ALLENATORI
      // ========================================

      allenatori:
        contesto.allenatori,


      // ========================================
      // ARBITRI
      // ========================================

      arbitri:
        contesto.arbitri,


      // ========================================
      // CLASSIFICA
      // ========================================

      classifica:
        contesto.classifica,


      // ========================================
      // ULTIME PARTITE
      // ========================================

      ultime_partite:
        contesto.ultime_partite,


      // ========================================
      // SCONTRO DIRETTO
      // ========================================

      scontro_diretto:
        contesto.scontro_diretto,


      // ========================================
      // TUTTI GLI EVENTI
      // ========================================

      eventi,


      // ========================================
      // GOL
      // ========================================

      gol:
        eventiSeparati.gol,


      // ========================================
      // CARTELLINI
      // ========================================

      cartellini: {

        gialli:
          eventiSeparati.cartellini_gialli,

        rossi:
          eventiSeparati.cartellini_rossi

      },


      // ========================================
      // SOSTITUZIONI
      // ========================================

      sostituzioni:
        eventiSeparati.sostituzioni,


      // ========================================
      // RIGORI
      // ========================================

      rigori:
        eventiSeparati.rigori,


      // ========================================
      // FORMAZIONI
      // ========================================

      formazioni,


      // ========================================
      // STATISTICHE SQUADRE
      // ========================================

      statistiche_squadre:
        statistiche,


      // ========================================
      // ALTRI EVENTI
      // ========================================

      altri_eventi:
        eventiSeparati.altri,


      // ========================================
      // DATI TECNICI
      // ========================================

      dati_tecnici:
        datiTecnici,


      // ========================================
      // DATI ORIGINALI ESPN
      // ========================================

      dati_originali:
        summary

    });


  } catch (error) {

    console.error(
      "Errore API partita:",
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
