import { espnFetch } from "../lib/espn.js";

export default async function handler(req, res) {
  try {
    const { league = "ita.1", id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Parametro id mancante"
      });
    }

    const data = await espnFetch(
      league,
      "summary",
      {
        event: id
      }
    );

    res.status(200).json({
      success: true,
      source: "ESPN",
      league,
      partita: data
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
