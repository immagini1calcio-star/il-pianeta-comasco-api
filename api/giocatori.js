import { trovaComo } from "../lib/como.js";
import { espnFetch } from "../lib/espn.js";


export default async function handler(req, res) {

  try {

    // ==========================================
    // TROVA COMO
    // ==========================================

    const como =
      await trovaComo();


    // ==========================================
    // RECUPERA ROSA ESPN
    // ==========================================

    const roster =
      await espnFetch(
        "ita.1",
        `teams/${como.id}/roster`
      );


    // ==========================================
    // ELENCO ATLETI
    // ==========================================

    const atleti =
      roster?.athletes ||
      roster?.athletes?.items ||
      [];


    // ==========================================
    // NORMALIZZAZIONE GIOCATORI
    // ==========================================

    const giocatori =
      atleti.map((item) => {

        const atleta =
          item.athlete ||
          item;


        return {

          // ==============================
          // IDENTIFICAZIONE
          // ==============================

          id:
            atleta.id ||
            null,

          nome:
            atleta.displayName ||
            atleta.fullName ||
            null,

          nome_completo:
            atleta.fullName ||
            atleta.displayName ||
            null,

          nome_breve:
            atleta.shortName ||
            null,

          nome_abbreviazione:
            atleta.abbreviation ||
            null,

          cognome:
            atleta.lastName ||
            null,


          // ==============================
          // DATI SPORTIVI
          // ==============================

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

          posizione_roster:
            item.position ||
            null,


          // ==============================
          // DATI PERSONALI DISPONIBILI
          // ==============================

          nazionalita:
            atleta.nationality ||
            null,

          eta:
            atleta.age ||
            null,

          data_nascita:
            atleta.dateOfBirth ||
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


          // ==============================
          // IMMAGINI
          // ==============================

          foto:
            atleta.headshot?.href ||
            null,


          // ==============================
          // STATO
          // ==============================

          stato:
            atleta.status ||
            null,


          // ==============================
          // DATI EXTRA ESPN
          // ==============================

          posizione:
            atleta.position ||
            null,

          team:
            atleta.team ||
            null

        };

      });


    // ==========================================
    // RISPOSTA
    // ==========================================

    res.status(200).json({

      success: true,

      source: "ESPN",


      // ========================================
      // SQUADRA
      // ========================================

      squadra: {

        id:
          como.id ||
          null,

        nome:
          como.displayName ||
          null,

        nome_breve:
          como.shortDisplayName ||
          null,

        abbreviazione:
          como.abbreviation ||
          null,

        logo:
          como.logos?.[0]?.href ||
          null

      },


      // ========================================
      // TOTALE
      // ========================================

      totale:
        giocatori.length,


      // ========================================
      // GIOCATORI
      // ========================================

      giocatori,


      // ========================================
      // DATI ORIGINALI
      // ========================================

      dati_originali:
        roster

    });


  } catch (error) {

    console.error(
      "Errore API giocatori:",
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
