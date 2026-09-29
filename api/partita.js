import { espnFetch } from "../lib/espn.js";
import {
  normalizzaEventi,
  separaEventi
} from "../lib/partita.js";

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

    const eventi = normalizzaEventi(summary);

    const eventiSeparati = separaEventi(eventi);

    res.status(200).json({
      success: true,

      source: "ESPN",

      league,

      partita: {
        id,

        nome:
          summary.header?.competitions?.[0]?.name ||
          null,

        data:
          summary.header?.competitions?.[0]?.date ||
          null,

        stato:
          summary.header?.competitions?.[0]?.status ||
          null
      },

      eventi,

      gol: eventiSeparati.gol,

      cartellini: {
        gialli: eventiSeparati.cartellini_gialli,
        rossi: eventiSeparati.cartellini_rossi
      },

      sostituzioni:
        eventiSeparati.sostituzioni,

      rigori:
        eventiSeparati.rigori,

      altri_eventi:
        eventiSeparati.altri,

      dati_originali: summary
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
