import { espnFetch } from "../lib/espn.js";
import { normalizzaFormazioni } from "../lib/formazioni.js";

export default async function handler(req, res) {
  try {
    const {
      id,
      league = "ita.1"
    } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        source: "ESPN",
        error: "Parametro id partita mancante"
      });
    }

    const summary = await espnFetch(
      league,
      "summary",
      {
        event: id
      }
    );

    const formazioni =
      normalizzaFormazioni(summary);

    const competizione =
      summary?.header?.competitions?.[0] || null;

    const competitors =
      competizione?.competitors || [];

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

    res.status(200).json({
      success: true,

      source: "ESPN",

      league,

      partita: {
        id,

        nome:
          summary?.header?.competitions?.[0]
            ?.competitors
            ?.map(
              (team) =>
                team.team?.displayName
            )
            .filter(Boolean)
            .join(" - ") ||
          null,

        casa: casa
          ? {
              id:
                casa.team?.id ||
                null,

              nome:
                casa.team?.displayName ||
                null,

              logo:
                casa.team?.logo ||
                null
            }
          : null,

        trasferta: trasferta
          ? {
              id:
                trasferta.team?.id ||
                null,

              nome:
                trasferta.team?.displayName ||
                null,

              logo:
                trasferta.team?.logo ||
                null
            }
          : null
      },

      totale_squadre:
        formazioni.length,

      formazioni,

      dati_originali:
        summary
    });

  } catch (error) {
    console.error(
      "Errore API formazioni:",
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
