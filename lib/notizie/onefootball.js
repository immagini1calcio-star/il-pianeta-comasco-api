// ============================================
// ONEFOOTBALL NEWS CONNECTOR
// ============================================
//
// OneFootball può distribuire sia contenuti
// propri sia contenuti di partner.
//
// Questo modulo NON inventa endpoint,
// articoli o dati.
//
// Riceve articoli già individuati dal
// raccoglitore e li normalizza nel formato
// comune delle notizie.
// ============================================


const NOME_FONTE =
  "OneFootball";


const DOMINIO =
  "onefootball.com";


// ============================================
// CONTROLLA URL ONEFOOTBALL
// ============================================

export function isOneFootballUrl(
  url
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
        DOMINIO
      );

  } catch {

    return false;

  }

}


// ============================================
// ESTRAE TESTO SICURO
// ============================================

function testo(
  valore
) {

  if (
    valore === undefined ||
    valore === null
  ) {

    return null;

  }


  const risultato =
    String(valore)
      .replace(/\s+/g, " ")
      .trim();


  return risultato ||
    null;

}


// ============================================
// NORMALIZZA UN ARTICOLO
// ============================================

export function normalizzaOneFootball(
  articolo
) {

  if (!articolo) {

    return null;

  }


  const url =
    testo(
      articolo.url ||
      articolo.link
    );


  // Se viene passato un URL,
  // controlliamo che sia realmente
  // di OneFootball.

  if (
    url &&
    !isOneFootballUrl(url)
  ) {

    return null;

  }


  return {

    id:
      testo(
        articolo.id
      ),


    titolo:
      testo(
        articolo.titolo ||
        articolo.title ||
        articolo.headline
      ),


    testo:
      testo(
        articolo.testo ||
        articolo.content ||
        articolo.body
      ),


    sommario:
      testo(
        articolo.sommario ||
        articolo.summary ||
        articolo.description
      ),


    data_pubblicazione:
      testo(
        articolo.data_pubblicazione ||
        articolo.publishedAt ||
        articolo.published_at ||
        articolo.date
      ),


    categoria:
      testo(
        articolo.categoria ||
        articolo.category ||
        articolo.type
      ),


    immagine:
      testo(
        articolo.immagine ||
        articolo.image ||
        articolo.imageUrl
      ),


    url,


    fonte: {

      codice:
        "onefootball",

      nome:
        NOME_FONTE,

      dominio:
        DOMINIO

    },


    squadra: {

      id:
        testo(
          articolo.squadra_id
        ),

      nome:
        testo(
          articolo.squadra_nome
        ) ||
        "Como"

    },


    origine:

      articolo.origine ||
      "OneFootball"

  };

}


// ============================================
// NORMALIZZA UNA LISTA DI ARTICOLI
// ============================================

export function normalizzaListaOneFootball(
  articoli
) {

  if (
    !Array.isArray(articoli)
  ) {

    return [];

  }


  return articoli

    .map(
      normalizzaOneFootball
    )

    .filter(Boolean);

}


// ============================================
// FILTRA SOLO NOTIZIE SUL COMO
// ============================================

export function filtraNotizieComo(
  articoli
) {

  if (
    !Array.isArray(articoli)
  ) {

    return [];

  }


  return articoli.filter(
    (articolo) => {

      const testoCompleto = [

        articolo?.titolo,

        articolo?.testo,

        articolo?.sommario,

        articolo?.squadra?.nome

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();


      return (

        testoCompleto.includes(
          "como"
        )

        ||

        testoCompleto.includes(
          "como 1907"
        )

      );

    }
  );

}


// ============================================
// ESPORTAZIONE CONFIGURAZIONE
// ============================================

export const ONEFOOTBALL_CONFIG = {

  codice:
    "onefootball",

  nome:
    NOME_FONTE,

  dominio:
    DOMINIO,

  squadra:
    "Como"

};
