import { espnFetch } from "../lib/espn.js";

import {
  normalizzaEventi,
  separaEventi
} from "../lib/partita.js";

import {
  estraiDatiTecnici
} from "../lib/statistiche.js";


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


    const summary = await espnFetch(
      league,
      "summary",
      {
        event: id
      }
    );


    const eventi =
      normalizzaEventi(summary);


    const eventiSeparati =
      separaEventi(eventi);


    const datiTecnici =
      estraiDatiTecnici(summary);


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


    res.status(200).json({

      success: true,

      source: "ESPN",

      league,


      partita: {

        id,

        nome:
          competition?.competitors
            ?.map(team => team.team?.displayName)
            ?.join(" - ") || null,

        data:
          competition?.date || null,

        stato:
          competition?.status || null,

        casa: home?.team || null,

        trasferta: away?.team || null,

        punteggio: {

          casa:
            home?.score || null,

          trasferta:
            away?.score || null

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
        datiTecnici.statistiche_squadre,


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
