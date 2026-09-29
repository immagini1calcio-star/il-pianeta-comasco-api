import { trovaComo } from "../lib/como.js";

import {
  normalizzaListaOneFootball,
  filtraNotizieComo
} from "../lib/notizie/onefootball.js";

import {
  recuperaNotizieSky
} from "../lib/notizie/sky.js";

import {
  recuperaNotizieGazzetta
} from "../lib/notizie/gazzetta.js";

import {
  recuperaNotizieTMW
} from "../lib/notizie/tuttomercatoweb.js";


// ============================================
// CONFIGURAZIONE FONTI
// ============================================

const FONTI = {

  onefootball: {
    codice: "onefootball",
    nome: "OneFootball"
  },

  sky_sport: {
    codice: "sky_sport",
    nome: "Sky Sport"
  },

  gazzetta: {
    codice: "gazzetta",
    nome: "La Gazzetta dello Sport"
  },

  tuttomercatoweb: {
    codice: "tuttomercatoweb",
    nome: "TuttomercatoWEB"
  }

};


// ============================================
// RIMUOVE DUPLICATI
// ============================================

function rimuoviDuplicati(
  notizie
) {

  const mappa =
    new Map();


  for (
    const notizia
    of notizie
  ) {

    if (!notizia) {
      continue;
    }


    const chiave =
      notizia.url ||
      `${notizia.fonte?.codice || "fonte"}-${notizia.titolo || ""}`;


    if (
      !mappa.has(chiave)
    ) {

      mappa.set(
        chiave,
        notizia
      );

    }

  }


  return [
    ...mappa.values()
  ];

}


// ============================================
// ORDINA PER DATA
// ============================================

function ordinaPerData(
  notizie
) {

  return notizie.sort(
    (a, b) => {

      const dataA =
        a?.data_pubblicazione
          ? new Date(
              a.data_pubblicazione
            ).getTime()
          : 0;


      const dataB =
        b?.data_pubblicazione
          ? new Date(
              b.data_pubblicazione
            ).getTime()
          : 0;


      return dataB - dataA;

    }
  );

}


// ============================================
// NORMALIZZA NOTIZIA GENERICA
// ============================================

function normalizzaGenerica(
  articolo,
  fonte
) {

  if (!articolo) {
    return null;
  }


  return {

    id:
      articolo.id ||
      null,

    titolo:
      articolo.titolo ||
      articolo.title ||
      null,

    testo:
      articolo.testo ||
      articolo.content ||
      null,

    sommario:
      articolo.sommario ||
      articolo.summary ||
      null,

    data_pubblicazione:
      articolo.data_pubblicazione ||
      articolo.publishedAt ||
      articolo.date ||
      null,

    categoria:
      articolo.categoria ||
      null,

    immagine:
      articolo.immagine ||
      articolo.image ||
      null,

    url:
      articolo.url ||
      articolo.link ||
      null,

    fonte: {

      codice:
        fonte,

      nome:
        FONTI[fonte]?.nome ||
        fonte

    },

    squadra: {

      id:
        articolo.squadra_id ||
        null,

      nome:
        articolo.squadra_nome ||
        "Como"

    }

  };

}


// ============================================
// CREA STATO DELLA FONTE
// ============================================

function statoFonte(
  codice,
  stato,
  totale = 0,
  errore = null
) {

  return {

    codice,

    nome:
      FONTI[codice]?.nome ||
      codice,

    stato,

    totale,

    errore

  };

}


// ============================================
// HANDLER
// ============================================

export default async function handler(
  req,
  res
) {

  try {

    // ========================================
    // TROVA COMO
    // ========================================

    const como =
      await trovaComo();


    const limite =
      Math.min(
        Number(
          req.query?.limit ||
          50
        ),
        100
      );


    // ========================================
    // RISULTATI
    // ========================================

    const notizie = [];


    const fonti = [];


    // ========================================
    // ONEFOOTBALL
    // ========================================

    try {

      /*
       * OneFootball non espone un endpoint
       * pubblico unico che possiamo assumere.
       *
       * Per questo il connettore viene
       * preparato per ricevere eventuali
       * articoli raccolti da un livello
       * esterno.
       */

      const articoliOneFootball = [];


      const normalizzate =
        normalizzaListaOneFootball(
          articoliOneFootball
        );


      const soloComo =
        filtraNotizieComo(
          normalizzate
        );


      notizie.push(
        ...soloComo
      );


      fonti.push(
        statoFonte(
          "onefootball",
          "predisposta",
          soloComo.length
        )
      );

    } catch (error) {

      console.error(
        "Errore OneFootball:",
        error.message
      );


      fonti.push(
        statoFonte(
          "onefootball",
          "errore",
          0,
          error.message
        )
      );

    }


    // ========================================
    // SKY SPORT
    // ========================================

    try {

      const articoliSky =
        await recuperaNotizieSky({
          limit: limite
        });


      notizie.push(
        ...articoliSky
      );


      fonti.push(
        statoFonte(
          "sky_sport",
          "ok",
          articoliSky.length
        )
      );

    } catch (error) {

      console.error(
        "Errore Sky Sport:",
        error.message
      );


      fonti.push(
        statoFonte(
          "sky_sport",
          "errore",
          0,
          error.message
        )
      );

    }


    // ========================================
    // GAZZETTA
    // ========================================

    try {

      const articoliGazzetta =
        await recuperaNotizieGazzetta({
          limit: limite
        });


      notizie.push(
        ...articoliGazzetta
      );


      fonti.push(
        statoFonte(
          "gazzetta",
          "ok",
          articoliGazzetta.length
        )
      );

    } catch (error) {

      console.error(
        "Errore Gazzetta:",
        error.message
      );


      fonti.push(
        statoFonte(
          "gazzetta",
          "errore",
          0,
          error.message
        )
      );

    }


    // ========================================
    // TUTTOMERCATOWEB
    // ========================================

    try {

      const articoliTMW =
        await recuperaNotizieTMW({
          limit: limite
        });


      notizie.push(
        ...articoliTMW
      );


      fonti.push(
        statoFonte(
          "tuttomercatoweb",
          "ok",
          articoliTMW.length
        )
      );

    } catch (error) {

      console.error(
        "Errore TuttomercatoWEB:",
        error.message
      );


      fonti.push(
        statoFonte(
          "tuttomercatoweb",
          "errore",
          0,
          error.message
        )
      );

    }


    // ========================================
    // NORMALIZZAZIONE FINALE
    // ========================================

    let risultato =
      notizie
        .map(
          (notizia) =>
            normalizzaGenerica(
              notizia,
              notizia?.fonte?.codice ||
              "sconosciuta"
            )
        )
        .filter(Boolean);


    // ========================================
    // SOLO COMO
    // ========================================

    risultato =
      risultato.filter(
        (notizia) => {

          const testo =
            [
              notizia.titolo,
              notizia.testo,
              notizia.sommario,
              notizia.squadra?.nome
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


          return (

            testo.includes("como")

            ||

            testo.includes(
              "fabregas"
            )

            ||

            testo.includes(
              "sinigaglia"
            )

          );

        }
      );


    // ========================================
    // DUPLICATI
    // ========================================

    risultato =
      rimuoviDuplicati(
        risultato
      );


    // ========================================
    // ORDINAMENTO
    // ========================================

    risultato =
      ordinaPerData(
        risultato
      );


    // ========================================
    // LIMITE FINALE
    // ========================================

    risultato =
      risultato.slice(
        0,
        limite * 4
      );


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source:
        "NEWS_AGGREGATOR",

      squadra: {

        id:
          como.id ||
          null,

        nome:
          como.displayName ||
          "Como",

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


      fonti,


      totale:
        risultato.length,


      notizie:
        risultato,


      aggiornamento:
        new Date().toISOString()


    });

  } catch (error) {

    console.error(
      "Errore API notizie:",
      error
    );


    res.status(500).json({

      success: false,

      source:
        "NEWS_AGGREGATOR",

      error:
        error?.message ||
        "Errore sconosciuto"

    });

  }

}
