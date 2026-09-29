const GAZZETTA_URL =
  "https://www.gazzetta.it/Calcio/";

const NOME_FONTE =
  "La Gazzetta dello Sport";

const DOMINIO =
  "gazzetta.it";


// ============================================
// UTILITÀ TESTO
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

  return testo || null;

}


// ============================================
// URL GAZZETTA
// ============================================

export function isGazzettaUrl(url) {

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
// URL ASSOLUTO
// ============================================

function urlAssoluto(url) {

  if (!url) {
    return null;
  }

  try {

    return new URL(
      url,
      GAZZETTA_URL
    ).href;

  } catch {

    return null;

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
    .replace(/\s+/g, " ")
    .trim();

}


// ============================================
// ESTRAE ARTICOLI DALL'HTML
// ============================================

function estraiArticoliHtml(html) {

  const risultati = [];

  if (!html) {
    return risultati;
  }


  /*
   * Gazzetta utilizza diverse strutture HTML
   * nelle proprie pagine.
   *
   * Cerchiamo quindi i link agli articoli
   * senza dipendere da una singola classe CSS.
   */

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
      !isGazzettaUrl(url)
    ) {
      continue;
    }


    /*
     * Evita link di navigazione,
     * categorie e pagine generiche.
     */

    const urlLower =
      url.toLowerCase();


    if (
      urlLower ===
      GAZZETTA_URL.toLowerCase()
    ) {
      continue;
    }


    if (
      urlLower.includes("/calcio/") === false
    ) {
      continue;
    }


    if (
      titolo.length < 12
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
        .split("#")[0]
        .split("?")[0];


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
// FILTRA CONTENUTI COMO
// ============================================

function filtraComo(
  articoli
) {

  return articoli.filter(
    (articolo) => {

      const testo =
        [
          articolo?.titolo,
          articolo?.sommario
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

        ||

        testo.includes(
          "douvikas"
        )

      );

    }
  );

}


// ============================================
// NORMALIZZA ARTICOLO
// ============================================

export function normalizzaGazzetta(
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
        articolo.titolo ||
        articolo.title
      ),


    testo:
      pulisciTesto(
        articolo.testo ||
        articolo.content
      ),


    sommario:
      pulisciTesto(
        articolo.sommario ||
        articolo.summary ||
        articolo.description
      ),


    data_pubblicazione:
      articolo.data_pubblicazione ||
      articolo.publishedAt ||
      articolo.date ||
      null,


    categoria:
      articolo.categoria ||
      "calcio",


    immagine:
      articolo.immagine ||
      articolo.image ||
      null,


    url:
      articolo.url ||
      null,


    fonte: {

      codice:
        "gazzetta",

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
// RECUPERA NEWS GAZZETTA
// ============================================

export async function recuperaNotizieGazzetta(
  options = {}
) {

  const url =
    options.url ||
    GAZZETTA_URL;


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
      `Gazzetta HTTP ${response.status}`
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
    normalizzaGazzetta
  );

}


// ============================================
// CONFIGURAZIONE
// ============================================

export const GAZZETTA_CONFIG = {

  codice:
    "gazzetta",

  nome:
    NOME_FONTE,

  dominio:
    DOMINIO,

  url:
    GAZZETTA_URL,

  squadra:
    "Como"

};
