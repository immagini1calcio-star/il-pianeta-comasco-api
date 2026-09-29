import { espnFetch } from "../lib/espn.js";

export default async function handler(req, res) {
  try {
    const {
      league = "ita.1",
      dates
    } = req.query;

    const data = await espnFetch(
      league,
      "scoreboard",
      {
        dates
      }
    );

    res.status(200).json({
      success: true,
      source: "ESPN",
      league,
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
