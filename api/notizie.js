import { trovaComo } from "../lib/como.js";


const FONTI = {

  onefootball: {
    nome: "OneFootball",
    dominio: "onefootball.com"
  },

  sky_sport: {
    nome: "Sky Sport",
    dominio: "sport.sky.it"
  },

  gazzetta: {
    nome: "La Gazzetta dello Sport",
    dominio: "gazzetta.it"
  },

  tuttomercatoweb: {
    nome: "TuttomercatoWEB",
    dominio: "tuttomercatoweb.com"
  }

};


// ============================================
// CONTROLLA SE L'URL APPARTIENE ALLA FONTE
// ============================================

function appartieneAllaFonte(
  url,
  dominio
) {

  if (!url) {
    return false;
  }

  try {

    const parsed =
      new URL(url);

    return parsed.hostname
      .toLowerCase()
      .includes(
        dominio.toLowerCase()
      );

  } catch {

    return false;

  }

}


// ============================================
// NORMALIZZA UNA NOTIZIA
// ============================================

function normalizzaNotizia(
  articolo,
  fonte
) {

  return {

    id:
      articolo.id ||
      null,

    titolo:
      articolo.titolo ||
      null,

    testo:
      articolo.testo ||
      articolo.sommario ||
      null,

    sommario:
      articolo.sommario ||
      null,

    data_pubblicazione:
      articolo.data_pubblicazione ||
      null,

    categoria:
      articolo.categoria ||
      null,

    immagine:
      articolo.immagine ||
      null,

    url:
      articolo.url ||
      null,

    fonte: {

      codice:
        fonte,

      nome:
        FONTI[fonte]?.nome ||
        fonte,

      dominio:
        FONTI[fonte]?.dominio ||
        null

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
// RECUPERA URL FORNITI NELLA RICHIESTA
// ============================================

function leggiUrlDaQuery(
  req
) {

  let urls =
    req.query?.url ||
    req.query?.urls ||
    [];

  if (!Array.isArray(urls)) {

    urls =
      String(urls)
        .split(",");

  }

  return urls
    .map(
      (url) =>
        String(url).trim()
    )
    .filter(Boolean);

}


// ============================================
// RAGGRUPPA GLI URL PER FONTE
// ============================================

function identificaFonte(
  url
) {

  for (
    const codice
    of Object.keys(FONTI)
  ) {

    if (
      appartieneAllaFonte(
        url,
        FONTI[codice].dominio
      )
    ) {

      return codice;

    }

  }

  return null;

}


// ============================================
// HANDLER
// ============================================

export default async function handler(
  req,
  res
) {

  try {

    const como =
      await trovaComo();


    const urls =
      leggiUrlDaQuery(
        req
      );


    const notizie = [];


    // ========================================
    // URL FORNITI
    // ========================================

    for (
      const url
      of urls
    ) {

      const fonte =
        identificaFonte(
          url
        );


      if (!fonte) {

        continue;

      }


      notizie.push(

        normalizzaNotizia(

          {

            id:
              null,

            titolo:
              null,

            testo:
              null,

            sommario:
              null,

            data_pubblicazione:
              null,

            categoria:
              null,

            immagine:
              null,

            url,

            squadra_id:
              como.id,

            squadra_nome:
              como.displayName ||
              "Como"

          },

          fonte

        )

      );

    }


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source: "NEWS_AGGREGATOR",


      squadra: {

        id:
          como.id ||
          null,

        nome:
          como.displayName ||
          "Como",

        abbreviazione:
          como.abbreviation ||
          null,

        logo:
          como.logos?.[0]?.href ||
          null

      },


      fonti_disponibili:
        Object.entries(
          FONTI
        ).map(
          ([codice, fonte]) => ({

            codice,

            nome:
              fonte.nome,

            dominio:
              fonte.dominio

          })
        ),


      totale:
        notizie.length,


      notizie,


      nota:
        "Il modulo è predisposto per le quattro fonti. Gli articoli vengono memorizzati tramite metadati e URL senza copiare integralmente contenuti editoriali protetti."

    });


  } catch (error) {

    console.error(
      "Errore API notizie:",
      error
    );


    res.status(500).json({

      success: false,

      source: "NEWS_AGGREGATOR",

      error:
        error?.message ||
        "Errore sconosciuto"

    });

  }

  }
