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


export default async function handler(req, res) {

  try {

    const {
      league = "ita.1",
      id
    } = req.query;


    if (!id) {

      return res.status(400).json({
        success: false,
        error: "Parametro id mancante"
      });

    }


    // ==============================
    // SUMMARY ESPN
    // ==============================

    const summary = await espnFetch(
      league,
      "summary",
      {
        event: id
      }
    );


    const competition =
      summary?.header?.competitions?.[0];


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


    // ==============================
    // EVENTI
    // ==============================

    const eventi =
      normalizzaEventi(summary);


    const eventiSeparati =
      separaEventi(eventi);


    // ==============================
    // DATI TECNICI
    // ==============================

    const datiTecnici =
      estraiDatiTecnici(summary);


    // ==============================
    // STATISTICHE ESPN CORE
    // ==============================

    let statisticheCasa = [];

    let statisticheTrasferta = [];


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


    const statistiche =
      creaStatistichePartita(
        statisticheCasa,
        statisticheTrasferta
      );


    // ==============================
    // RISPOSTA
    // ==============================

    res.status(200).json({

      success: true,

      source: "ESPN",

      league,


      partita: {

        id,

        nome:
          competition?.competitors
            ?.map(team =>
              team.team?.displayName
            )
            ?.join(" - ") || null,

        data:
          competition?.date || null,

        stato:
          competition?.status || null,


        casa: {

          id:
            home?.team?.id ||
            home?.id ||
            null,

          nome:
            home?.team?.displayName ||
            null,

          logo:
            home?.team?.logo ||
            null,

          punteggio:
            home?.score ||
            null

        },


        trasferta: {

          id:
            away?.team?.id ||
            away?.id ||
            null,

          nome:
            away?.team?.displayName ||
            null,

          logo:
            away?.team?.logo ||
            null,

          punteggio:
            away?.score ||
            null

        }

      },


      eventi,


      gol:
        eventiSeparati.gol,


      cartellini: {

        gialli:
          eventiSeparati.cartellini_gialli,

        rossi:
          eventiSeparati.cartellini_rossi

      },


      sostituzioni:
        eventiSeparati.sostituzioni,


      rigori:
        eventiSeparati.rigori,


      formazioni:
        datiTecnici.formazioni,


      statistiche_squadre:
        statistiche,


      altri_eventi:
        eventiSeparati.altri,


      dati_originali:
        summary

    });


  } catch (error) {

    console.error(error);


    res.status(500).json({

      success: false,

      source: "ESPN",

      error: error.message

    });

  }

}
