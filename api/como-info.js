import { espnFetch } from "../lib/espn.js";
import { trovaComo } from "../lib/como.js";

export default async function handler(req, res) {
  try {
    const como = await trovaComo();

    const teamId = como.id;

    const [
      roster,
      schedule,
      injuries
    ] = await Promise.all([
      espnFetch(
        "ita.1",
        `teams/${teamId}/roster`
      ),

      espnFetch(
        "ita.1",
        `teams/${teamId}/schedule`
      ),

      espnFetch(
        "ita.1",
        `teams/${teamId}/injuries`
      )
    ]);

    res.status(200).json({
      success: true,

      source: "ESPN",

      squadra: {
        id: como.id,
        nome: como.displayName,
        nome_breve: como.shortDisplayName,
        abbreviazione: como.abbreviation,
        logo: como.logos?.[0]?.href || null,
        colori: como.color || null
      },

      rosa: roster,

      calendario: schedule,

      infortuni: injuries
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
