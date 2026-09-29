import { espnFetch } from "../lib/espn.js";
import { trovaComo } from "../lib/como.js";


export default async function handler(req, res) {

  try {

    // ==========================================
    // TROVA AUTOMATICAMENTE IL COMO
    // ==========================================

    const como = await trovaComo();

    const teamId = como.id;


    // ==========================================
    // RECUPERO DATI ESPN
    // ==========================================

    const [
      roster,
      schedule,
      injuries
    ] = await Promise.all([

      // Rosa
      espnFetch(
        "ita.1",
        `teams/${teamId}/roster`
      ),

      // Calendario
      espnFetch(
        "ita.1",
        `teams/${teamId}/schedule`
      ),

      // Infortuni / indisponibili
      espnFetch(
        "ita.1",
        `teams/${teamId}/injuries`
      )

    ]);


    // ==========================================
    // NORMALIZZAZIONE ROSA
    // ==========================================

    const atleti =
      roster?.athletes ||
      roster?.athletes?.items ||
      [];


    const giocatori = atleti.map((item) => {

      const atleta =
        item.athlete ||
        item;


      return {

        id:
          atleta.id ||
          null,

        nome:
          atleta.displayName ||
          atleta.fullName ||
          null,

        nome_breve:
          atleta.shortName ||
          null,

        cognome:
          atleta.lastName ||
          null,

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

        nazionalita:
          atleta.nationality ||
          null,

        eta:
          atleta.age ||
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

        foto:
          atleta.headshot?.href ||
          null,

        posizione_roster:
          item.position ||
          null,

        stato:
          atleta.status ||
          null

      };

    });


    // ==========================================
    // NORMALIZZAZIONE INDISPONIBILI
    // ==========================================

    const injuriesList =
      injuries?.injuries ||
      [];


    const indisponibili =
      injuriesList.map((item) => {

        const atleta =
          item.athlete ||
          {};


        return {

          id:
            item.id ||
            null,

          giocatore: {

            id:
              atleta.id ||
              null,

            nome:
              atleta.displayName ||
              atleta.fullName ||
              null,

            ruolo:
              atleta.position?.displayName ||
              atleta.position?.name ||
              null,

            ruolo_abbreviazione:
              atleta.position?.abbreviation ||
              null,

            foto:
              atleta.headshot?.href ||
              null

          },

          tipo:
            item.type?.name ||
            null,

          descrizione:
            item.detail ||
            item.type?.description ||
            null,

          parte_corpo:
            item.location ||
            null,

          lato:
            item.side ||
            null,

          stato:
            item.status ||
            null,

          data:
            item.date ||
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
      // DATI GENERALI COMO
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
          null,

        colori:
          como.color ||
          null

      },


      // ========================================
      // ROSA
      // ========================================

      rosa: {

        totale:
          giocatori.length,

        giocatori

      },


      // ========================================
      // CALENDARIO
      // ========================================

      calendario:
        schedule,


      // ========================================
      // INDISPONIBILI
      // ========================================

      infortuni: {

        totale:
          indisponibili.length,

        indisponibili

      },


      // ========================================
      // DATI ORIGINALI ESPN
      // ========================================

      dati_originali: {

        roster,

        schedule,

        injuries

      }

    });


  } catch (error) {

    console.error(
      "Errore API Como:",
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
