import { COMO } from "../config/como.js";

export default async function handler(req, res) {
  try {

    const configurazione = {

      progetto: {
        nome: "Il Pianeta Comasco",
        versione: "1.0.0",
        sport: "Calcio"
      },

      squadra_principale: {
        nome: COMO.nome,
        abbreviazione: COMO.abbreviazione,
        espn_id: COMO.espnId,
        campionato: COMO.league
      },

      competizioni: {

        serie_a: {
          nome: "Serie A",
          espn_league: "ita.1",
          attiva: true
        },

        coppa_italia: {
          nome: "Coppa Italia",
          espn_league: "ita.coppa_italia",
          attiva: true
        },

        champions_league: {
          nome: "UEFA Champions League",
          espn_league: "uefa.champions",
          attiva: true
        },

        europa_league: {
          nome: "UEFA Europa League",
          espn_league: "uefa.europa",
          attiva: true
        },

        conference_league: {
          nome: "UEFA Conference League",
          espn_league: "uefa.europa.conf",
          attiva: true
        }

      },

      squadre: {

        prima_squadra_maschile: {
          nome: "Como",
          attiva: true
        },

        primavera_maschile: {
          nome: "Como Primavera",
          attiva: true
        },

        prima_squadra_femminile: {
          nome: "Como Women",
          attiva: true
        }

      },

      fonti: {

        partite: [
          "ESPN"
        ],

        classifiche: [
          "ESPN"
        ],

        giocatori: [
          "ESPN"
        ],

        notizie: [
          "OneFootball",
          "Sky Sport",
          "La Gazzetta dello Sport",
          "Tuttomercatoweb"
        ]

      },

      api: {

        partite: "/api/partite",

        partita: "/api/partita",

        como: "/api/como",

        como_team: "/api/como-team",

        como_info: "/api/como-info",

        classifica: "/api/classifica",

        giocatori: "/api/giocatori",

        statistiche_giocatori:
          "/api/statistiche-giocatori",

        indisponibili:
          "/api/indisponibili",

        squalificati:
          "/api/squalificati",

        coppe:
          "/api/coppe",

        notizie:
          "/api/notizie",

        formazioni:
          "/api/formazioni",

        scontri_diretti:
          "/api/scontri-diretti",

        configurazione:
          "/api/configurazione"

      },

      google_sheets: {

        attivo: false,

        sincronizzazione_automatica:
          false,

        stato:
          "Da configurare"

      }

    };


    res.status(200).json({

      success: true,

      source: "Il Pianeta Comasco API",

      configurazione

    });

  } catch (error) {

    console.error(
      "Errore API configurazione:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Errore sconosciuto"

    });

  }
        }
