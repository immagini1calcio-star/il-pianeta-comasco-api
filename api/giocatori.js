import { trovaComo } from "../lib/como.js";
import {
  espnFetch,
  espnCoreFetch
} from "../lib/espn.js";


// ==========================================
// NORMALIZZA UNA STATISTICA
// ==========================================

function normalizzaStatistica(stat) {

  if (!stat) {
    return null;
  }

  return {

    nome:
      stat.name ||
      stat.abbreviation ||
      null,

    descrizione:
      stat.displayName ||
      stat.description ||
      null,

    valore:
      stat.value ??
      null,

    valore_visualizzato:
      stat.displayValue ||
      stat.displayValueString ||
      null,

    abbreviazione:
      stat.abbreviation ||
      null

  };

}


// ==========================================
// ESTRAE LE CATEGORIE STATISTICHE
// ==========================================

function estraiCategorie(data) {

  const risultato = [];


  // ------------------------------------------
  // Caso 1: splits.categories
  // ------------------------------------------

  const categories =
    data?.splits?.categories ||
    [];


  for (const categoria of categories) {

    const statistiche =
      categoria.statistics ||
      categoria.stats ||
      [];


    risultato.push({

      categoria:
        categoria.displayName ||
        categoria.name ||
        categoria.abbreviation ||
        null,

      abbreviazione:
        categoria.abbreviation ||
        null,

      statistiche:
        statistiche
          .map(normalizzaStatistica)
          .filter(Boolean)

    });

  }


  // ------------------------------------------
  // Caso 2: statistics
  // ------------------------------------------

  if (
    !risultato.length &&
    Array.isArray(data?.statistics)
  ) {

    risultato.push({

      categoria:
        "generale",

      abbreviazione:
        null,

      statistiche:
        data.statistics
          .map(normalizzaStatistica)
          .filter(Boolean)

    });

  }


  // ------------------------------------------
  // Caso 3: categories direttamente
  // ------------------------------------------

  if (
    !risultato.length &&
    Array.isArray(data?.categories)
  ) {

    for (
      const categoria
      of data.categories
    ) {

      const statistiche =
        categoria.statistics ||
        categoria.stats ||
        [];


      risultato.push({

        categoria:
          categoria.displayName ||
          categoria.name ||
          categoria.abbreviation ||
          null,

        abbreviazione:
          categoria.abbreviation ||
          null,

        statistiche:
          statistiche
            .map(normalizzaStatistica)
            .filter(Boolean)

      });

    }

  }


  return risultato;

}


// ==========================================
// CREA INDICE STATISTICHE
// ==========================================

function creaIndiceStatistiche(categorie) {

  const indice = {};


  for (
    const categoria
    of categorie
  ) {

    for (
      const statistica
      of categoria.statistiche
    ) {

      if (!statistica.nome) {
        continue;
      }


      const chiave =
        statistica.nome;


      indice[chiave] = {

        categoria:
          categoria.categoria,

        descrizione:
          statistica.descrizione,

        valore:
          statistica.valore,

        valore_visualizzato:
          statistica.valore_visualizzato,

        abbreviazione:
          statistica.abbreviazione

      };

    }

  }


  return indice;

}


// ==========================================
// ESTRAE UNA STATISTICA SPECIFICA
// ==========================================

function trovaValore(indice, nomi) {

  for (
    const nome
    of nomi
  ) {

    if (
      indice[nome] !== undefined
    ) {

      return indice[nome];

    }

  }


  return null;

}


// ==========================================
// NORMALIZZA DATI GIOCATORE
// ==========================================

function creaGiocatoreBase(atleta) {

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

    foto:
      atleta.headshot?.href ||
      null

  };

}


// ==========================================
// CREA STATISTICHE NORMALIZZATE
// ==========================================

function creaStatisticheNormalizzate(
  categorie
) {

  const indice =
    creaIndiceStatistiche(
      categorie
    );


  const presenze =
    trovaValore(
      indice,
      [
        "appearances",
        "gamesPlayed",
        "games"
      ]
    );


  const titolare =
    trovaValore(
      indice,
      [
        "starts",
        "gamesStarted"
      ]
    );


  const minuti =
    trovaValore(
      indice,
      [
        "minutes",
        "minutesPlayed"
      ]
    );


  const gol =
    trovaValore(
      indice,
      [
        "goals",
        "goal"
      ]
    );


  const assist =
    trovaValore(
      indice,
      [
        "assists",
        "assist"
      ]
    );


  const gialli =
    trovaValore(
      indice,
      [
        "yellowCards",
        "yellow_card",
        "yellow"
      ]
    );


  const rossi =
    trovaValore(
      indice,
      [
        "redCards",
        "red_card",
        "red"
      ]
    );


  const cleanSheet =
    trovaValore(
      indice,
      [
        "cleanSheets",
        "cleanSheet"
      ]
    );


  const parate =
    trovaValore(
      indice,
      [
        "saves",
        "save"
      ]
    );


  const golSubiti =
    trovaValore(
      indice,
      [
        "goalsAgainst",
        "goalsConceded"
      ]
    );


  const rigoriParati =
    trovaValore(
      indice,
      [
        "penaltySaves",
        "penaltiesSaved"
      ]
    );


  return {

    presenze,

    titolare,

    minuti,

    gol,

    assist,

    cartellini_gialli:
      gialli,

    cartellini_rossi:
      rossi,

    clean_sheet:
      cleanSheet,

    parate,

    gol_subiti:
      golSubiti,

    rigori_parati:
      rigoriParati

  };

}


// ==========================================
// HANDLER
// ==========================================

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


    // ========================================
    // RECUPERA ROSA
    // ========================================

    const roster =
      await espnFetch(
        "ita.1",
        `teams/${como.id}/roster`
      );


    const atleti =
      roster?.athletes ||
      roster?.athletes?.items ||
      [];


    // ========================================
    // STATISTICHE GIOCATORI
    // ========================================

    const risultati = [];


    // Usiamo Promise.allSettled:
    // se ESPN non restituisce le statistiche
    // di un giocatore, gli altri continuano
    // comunque ad essere elaborati.

    const richieste =
      await Promise.allSettled(

        atleti.map(
          async (item) => {

            const atleta =
              item.athlete ||
              item;


            if (!atleta?.id) {

              return {

                atleta,

                statistiche: null,

                errore:
                  "ID giocatore mancante"

              };

            }


            try {

              const data =
                await espnCoreFetch(
                  "ita.1",
                  `athletes/${atleta.id}/statistics`
                );


              return {

                atleta,

                data,

                errore:
                  null

              };

            } catch (error) {

              return {

                atleta,

                data:
                  null,

                errore:
                  error?.message ||
                  "Errore statistiche"

              };

            }

          }
        )

      );


    // ========================================
    // COSTRUISCI RISULTATI
    // ========================================

    for (
      const risultato
      of richieste
    ) {

      if (
        risultato.status !==
        "fulfilled"
      ) {

        continue;

      }


      const valore =
        risultato.value;


      const atleta =
        valore.atleta;


      const data =
        valore.data;


      const categorie =
        estraiCategorie(
          data
        );


      const statistiche =
        creaStatisticheNormalizzate(
          categorie
        );


      risultati.push({

        giocatore:
          creaGiocatoreBase(
            atleta
          ),


        statistiche,


        categorie,


        disponibile:
          !!data,


        errore:
          valore.errore || null,


        dati_originali:
          data || null

      });

    }


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source: "ESPN",


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


      totale_giocatori:
        risultati.length,


      statistiche_disponibili:
        risultati.filter(
          (item) =>
            item.disponibile
        ).length,


      statistiche_non_disponibili:
        risultati.filter(
          (item) =>
            !item.disponibile
        ).length,


      giocatori:
        risultati

    });


  } catch (error) {

    console.error(
      "Errore API statistiche giocatori:",
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
