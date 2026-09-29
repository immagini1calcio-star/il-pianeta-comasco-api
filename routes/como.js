import { espnFetch } from "../lib/espn.js";
import { COMO } from "../config/como.js";
import { normalizzaPartita } from "../lib/normalizer.js";

export default async function handler(req, res) {
  try {
    const { dates } = req.query;

    const data = await espnFetch(
      COMO.league,
      "scoreboard",
      {
        dates
      }
    );

    const eventi = data.events || [];

    const partiteComo = eventi
      .filter((event) => {
        const competitors =
          event.competitions?.[0]?.competitors || [];

        return competitors.some((team) =>
          team.team?.displayName
            ?.toLowerCase()
            .includes("como")
        );
      })
      .map(normalizzaPartita);

    res.status(200).json({
      success: true,
      source: "ESPN",

      squadra: COMO,

      totale: partiteComo.length,

      partite: partiteComo
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
