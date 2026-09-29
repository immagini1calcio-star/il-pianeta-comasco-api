import { trovaComo } from "../lib/como.js";
import { espnFetch } from "../lib/espn.js";

export default async function handler(req, res) {
  try {
    const como = await trovaComo();

    const data = await espnFetch(
      "ita.1",
      `teams/${como.id}/injuries`
    );

    const injuries = data.injuries || [];

    const indisponibili = injuries.map((item) => {
      const atleta = item.athlete || {};

      return {
        id: item.id || null,

        giocatore: {
          id: atleta.id || null,
          nome: atleta.displayName || null,
          ruolo: atleta.position?.displayName || null,
          ruolo_abbreviazione:
            atleta.position?.abbreviation || null,
          foto: atleta.headshot?.href || null
        },

        tipo: item.type?.name || null,

        descrizione:
          item.detail ||
          item.type?.description ||
          null,

        parte_corpo:
          item.location ||
          null,

        lato:
          item.side ||
          null,

        stato:
          item.status ||
          null,

        data:
          item.date ||
          null
      };
    });

    res.status(200).json({
      success: true,
      source: "ESPN",

      squadra: {
        id: como.id,
        nome: como.displayName,
        logo: como.logos?.[0]?.href || null
      },

      totale: indisponibili.length,

      indisponibili
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
