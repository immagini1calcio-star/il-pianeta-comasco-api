import { trovaComo } from "../lib/como.js";
import { espnFetch } from "../lib/espn.js";


function testoSqualifica(valore) {

  if (!valore) {
    return "";
  }

  if (typeof valore === "string") {
    return valore.toLowerCase();
  }

  if (typeof valore === "object") {

    return [
      valore.name,
      valore.displayName,
      valore.description,
      valore.detail,
      valore.type
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  }

  return "";

}


function eSqualificato(atleta) {

  const testi = [

    atleta.status,

    atleta.status?.type,

    atleta.status?.name,

    atleta.status?.displayName,

    atleta.status?.description,

    atleta.status?.detail,

    atleta.injury,

    atleta.injury?.status,

    atleta.injury?.type

  ]
    .map(testoSqualifica)
    .filter(Boolean);


  const testo =
    testi.join(" ");


  return (
    testo.includes("suspend") ||
    testo.includes("suspension") ||
    testo.includes("squalif")
  );

}


export default async function handler(req, res) {

  try {

    // ==========================================
    // TROVA COMO
    // ==========================================

    const como =
      await trovaComo();


    // ==========================================
    // RECUPERA ROSA
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
    // CERCA SQUALIFICATI
    // ==========================================

    const squalificati =
      atleti

        .map((item) => {

          const atleta =
            item.athlete ||
            item;

          return {
            item,
            atleta
          };

        })

        .filter(({ atleta }) =>
          eSqualificato(atleta)
        )

        .map(({ atleta }) => {

          return {

            id:
              atleta.id ||
              null,

            giocatore: {

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

              foto:
                atleta.headshot?.href ||
                null

            },

            stato:
              atleta.status ||
              null,

            descrizione:
              atleta.status?.description ||
              atleta.status?.detail ||
              atleta.status?.displayName ||
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
      // SQUALIFICATI
      // ========================================

      totale:
        squalificati.length,


      squalificati,


      // ========================================
      // STATO FONTE
      // ========================================

      fonte_squalifiche:
        "ESPN roster/status",


      nota:
        squalificati.length === 0
          ? "Nessuna squalifica esposta nei dati ESPN della rosa."
          : "Squalifiche individuate nei dati ESPN della rosa.",


      // ========================================
      // DATI ORIGINALI
      // ========================================

      dati_originali:
        roster

    });


  } catch (error) {

    console.error(
      "Errore API squalificati:",
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
