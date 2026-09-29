const TMW_COMO_URL =
  "https://www.tuttomercatoweb.com/como/";

const NOME_FONTE =
  "TuttomercatoWEB";

const DOMINIO =
  "tuttomercatoweb.com";


// ============================================
// PULIZIA TESTO
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
// CONTROLLA URL TMW
// ============================================

export function isTMWUrl(url) {

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
    .replace(/\s+/g, " ")
    .trim();

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
      TMW_COMO_URL
    ).href;

  } catch {

    return null;

  }

}


// ============================================
// ESTRAE ARTICOLI DALLA PAGINA TMW
// ============================================

function estraiArticoliHtml(html) {

  const risultati = [];

  if (!html) {
    return risultati;
  }


  /*
   * Cerchiamo i link agli articoli.
   * Non dipendiamo da una singola classe CSS.
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
      !isTMWUrl(url)
    ) {
      continue;
    }


    const urlLower =
      url.toLowerCase();


    /*
     * La pagina /como/ contiene anche
     * collegamenti di navigazione.
     * Cerchiamo quindi principalmente
     * URL riconducibili agli articoli.
     */

    if (
      urlLower.includes("/como/")
      &&
      urlLower.endsWith("/")
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
// FILTRA NOTIZIE COMO
// ============================================

function filtraComo(
  articoli
) {

  return articoli.filter(
    (articolo) => {

      const testo =
        articolo?.titolo
          ?.toLowerCase() ||
        "";


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

}


// ============================================
// NORMALIZZA ARTICOLO
// ============================================

export function normalizzaTMW(
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
      null,


    immagine:
      articolo.immagine ||
      articolo.image ||
      null,


    url:
      articolo.url ||
      null,


    fonte: {

      codice:
        "tuttomercatoweb",

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
// RECUPERA NEWS TMW
// ============================================

export async function recuperaNotizieTMW(
  options = {}
) {

  const url =
    options.url ||
    TMW_COMO_URL;


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
      `TuttomercatoWEB HTTP ${response.status}`
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
    normalizzaTMW
  );

}


// ============================================
// CONFIGURAZIONE
// ============================================

export const TMW_CONFIG = {

  codice:
    "tuttomercatoweb",

  nome:
    NOME_FONTE,

  dominio:
    DOMINIO,

  url:
    TMW_COMO_URL,

  squadra:
    "Como"

};
