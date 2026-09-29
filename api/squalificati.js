export default async function handler(req, res) {
  try {
    res.status(200).json({
      success: true,

      source: "multiple",

      squadra: {
        nome: "Como"
      },

      totale: 0,

      squalificati: [],

      nota:
        "Le squalifiche verranno alimentate da una fonte specifica per le competizioni."
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
