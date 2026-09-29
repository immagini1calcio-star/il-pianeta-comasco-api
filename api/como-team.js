import { espnFetch } from "../lib/espn.js";

export default async function handler(req, res) {
  try {
    const data = await espnFetch(
      "ita.1",
      "teams"
    );

    const teams = data.sports?.[0]
      ?.leagues?.[0]
      ?.teams || [];

    const como = teams.find((item) =>
      item.team?.displayName
        ?.toLowerCase()
        .includes("como")
    );

    if (!como) {
      return res.status(404).json({
        success: false,
        error: "Como non trovato su ESPN"
      });
    }

    res.status(200).json({
      success: true,
      source: "ESPN",
      team: como.team
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
