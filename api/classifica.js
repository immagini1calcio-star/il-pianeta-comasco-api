import { espnFetchV2 } from "../lib/espn.js";

export default async function handler(req, res) {
  try {
    const {
      league = "ita.1",
      season,
      seasontype = "2"
    } = req.query;

    const params = {
      seasontype
    };

    if (season) {
      params.season = season;
    }

    const data = await espnFetchV2(
      league,
      "standings",
      params
    );

    res.status(200).json({
      success: true,
      source: "ESPN",
      league,
      season: season || null,
      data
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
