import { trovaComo } from "../lib/como.js";
import { espnFetch } from "../lib/espn.js";

export default async function handler(req, res) {
  try {
    const como = await trovaComo();

    const roster = await espnFetch(
      "ita.1",
      `teams/${como.id}/roster`
    );

    const atleti =
      roster.athletes ||
      roster.athletes?.items ||
      [];

    const giocatori = atleti.map((item) => {
      const atleta = item.athlete || item;

      return {
        id: atleta.id || null,

        nome:
          atleta.displayName ||
          atleta.fullName ||
          null,

        nome_breve:
          atleta.shortName ||
          null,

        cognome:
          atleta.lastName ||
          null,

        numero:
          atleta.jersey ||
          null,

        ruolo:
          atleta.position?.displayName ||
          atleta.position?.name ||
          null,

        ruolo_abbreviazione:
          atleta.position?.abbreviation ||
          null,

        nazionalita:
          atleta.nationality ||
          null,

        eta:
          atleta.age ||
          null,

        altezza:
          atleta.height ||
          null,

        peso:
          atleta.weight ||
          null,

        piede:
          atleta.foot ||
          null,

        foto:
          atleta.headshot?.href ||
          null,

        posizione_roster:
          item.position ||
          null,

        stato:
          atleta.status ||
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

      totale: giocatori.length,

      giocatori
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
