const SKY_COMO_NEWS_URL =
  "https://sport.sky.it/calcio/squadre/como/news";

const NOME_FONTE =
  "Sky Sport";

const DOMINIO =
  "sport.sky.it";


// ============================================
// TESTO
// ============================================

function pulisciTesto(valore) {

  if (
    valore === undefined ||
    valore === null
  ) {
    return null;
  }

  const testo =
    String(valore)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return textoVero(testo);
}


function textoVero(testo) {

  if (
    !testo ||
    testo.length === 0
  ) {
    return null;
  }

  return testo;
}


// ============================================
// URL SKY
// ============================================

export function isSkyUrl(url) {

  if (!url) {
    return false;
  }

  try {

    const parsed =
      new URL(url);

    return parsed.hostname
      .toLowerCase()
      .includes(DOMINIO);

  } catch {

    return false;

  }

}


// ============================================
// DECODIFICA HTML
// ============================================

function decodificaHtml(testo) {

  if (!testo) {
    return null;
  }

  return testo
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();

}


// ============================================
// CREA URL ASSOLUTO
// ============================================

function urlAssoluto(url) {

  if (!url) {
    return null;
  }

  try {

    return new URL(
      url,
      SKY_COMO_NEWS_URL
    ).href;

  } catch {

    return null;

  }

}


// ============================================
// ESTRAE ARTICOLI DALL'HTML
// ============================================

function estraiArticoliHtml(html) {

  const risultati = [];

  if (!html) {
    return risultati;
  }


  // ------------------------------------------
  // Cerca i link degli articoli Sky
  // ------------------------------------------

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


  let match;


  while (
    (match = regex.exec(html)) !== null
  ) {

    const href =
      decodificaHtml(
        match[1]
      );


    const contenuto =
      decodificaHtml(
        match[2]
      );


    const url =
      urlAssoluto(
        href
      );


    const titolo =
      pulisciTesto(
        contenuto
      );


    if (
      !url ||
      !titolo
    ) {
      continue;
    }


    if (
      !isSkyUrl(url)
    ) {
      continue;
    }


    // Evita link tecnici o di navigazione
    if (
      url.includes("/calcio/squadre/como/")
      &&
      !url.includes("/news/")
    ) {
      continue;
    }


    if (
      titolo.length < 10
    ) {
      continue;
    }


    risultati.push({

      titolo,

      url

    });

  }


  return risultati;

}


// ============================================
// RIMUOVE DUPLICATI
// ============================================

function rimuoviDuplicati(
  articoli
) {

  const mappa =
    new Map();


  for (
    const articolo
    of articoli
  ) {

    if (
      !articolo?.url
    ) {
      continue;
    }


    const chiave =
      articolo.url
        .split("#")[0];


    if (
      !mappa.has(chiave)
    ) {

      mappa.set(
        chiave,
        articolo
      );

    }

  }


  return [
    ...mappa.values()
  ];

}


// ============================================
// FILTRA NEWS COMO
// ============================================

function filtraComo(
  articoli
) {

  return articoli.filter(
    (articolo) => {

      const testo =
        [
          articolo.titolo,
          articolo.sommario
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


      return (
        testo.includes("como") ||
        testo.includes("fabregas") ||
        testo.includes("sinigaglia")
      );

    }
  );

}


// ============================================
// NORMALIZZA ARTICOLO
// ============================================

export function normalizzaSky(
  articolo
) {

  if (!articolo) {
    return null;
  }


  return {

    id:
      articolo.id ||
      null,


    titolo:
      pulisciTesto(
        articolo.titolo
      ),


    testo:
      pulisciTesto(
        articolo.testo
      ),


    sommario:
      pulisciTesto(
        articolo.sommario
      ),


    data_pubblicazione:
      articolo.data_pubblicazione ||
      null,


    categoria:
      articolo.categoria ||
      "calcio",


    immagine:
      articolo.immagine ||
      null,


    url:
      articolo.url ||
      null,


    fonte: {

      codice:
        "sky_sport",

      nome:
        NOME_FONTE,

      dominio:
        DOMINIO

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
// RECUPERA NEWS DA SKY SPORT
// ============================================

export async function recuperaNotizieSky(
  options = {}
) {

  const url =
    options.url ||
    SKY_COMO_NEWS_URL;


  const response =
    await fetch(
      url,
      {
        headers: {

          "User-Agent":
            "Mozilla/5.0 " +
            "(compatible; Il-Pianeta-Comasco/1.0)",

          "Accept":
            "text/html,application/xhtml+xml"

        }

      }
    );


  if (!response.ok) {

    throw new Error(
      `Sky Sport HTTP ${response.status}`
    );

  }


  const html =
    await response.text();


  let articoli =
    estraiArticoliHtml(
      html
    );


  articoli =
    rimuoviDuplicati(
      articoli
    );


  articoli =
    filtraComo(
      articoli
    );


  const limite =
    Number(
      options.limit ||
      50
    );


  articoli =
    articoli.slice(
      0,
      limite
    );


  return articoli.map(
    normalizzaSky
  );

}


// ============================================
// CONFIGURAZIONE
// ============================================

export const SKY_CONFIG = {

  codice:
    "sky_sport",

  nome:
    NOME_FONTE,

  dominio:
    DOMINIO,

  url:
    SKY_COMO_NEWS_URL,

  squadra:
    "Como"

};
