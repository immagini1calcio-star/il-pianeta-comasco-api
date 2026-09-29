import { espnFetchV2 } from "../lib/espn.js";


function trovaValore(statistiche, nomi) {

  if (!Array.isArray(statistiche)) {
    return null;
  }


  for (const statistica of statistiche) {

    const nome =
      statistica.name ||
      statistica.abbreviation ||
      "";


    if (nomi.includes(nome)) {

      return (
        statistica.value ??
        statistica.displayValue ??
        null
      );

    }

  }


  return null;

}


function normalizzaSquadraClassifica(
  elemento,
  posizione
) {

  const team =
    elemento?.team ||
    elemento?.competitor ||
    {};


  const statistiche =
    elemento?.stats ||
    elemento?.statistics ||
    [];


  const records =
    elemento?.records ||
    [];


  const record =
    records.find(
      (item) =>
        item.type === "total" ||
        item.type === "overall"
    ) ||
    records[0] ||
    null;


  const recordStats =
    record?.stats ||
    record?.statistics ||
    [];


  const tutteStatistiche = [
    ...statistiche,
    ...recordStats
  ];


  const vittorie =
    trovaValore(
      tutteStatistiche,
      [
        "wins",
        "win",
        "w"
      ]
    );


  const pareggi =
    trovaValore(
      tutteStatistiche,
      [
        "ties",
        "tie",
        "draws",
        "draw",
        "t"
      ]
    );


  const sconfitte =
    trovaValore(
      tutteStatistiche,
      [
        "losses",
        "loss",
        "l"
      ]
    );


  const punti =
    trovaValore(
      tutteStatistiche,
      [
        "points",
        "pts"
      ]
    );


  const golFatti =
    trovaValore(
      tutteStatistiche,
      [
        "pointsFor",
        "goalsFor",
        "goalsScored",
        "gf"
      ]
    );


  const golSubiti =
    trovaValore(
      tutteStatistiche,
      [
        "pointsAgainst",
        "goalsAgainst",
        "goalsConceded",
        "ga"
      ]
    );


  const differenzaReti =
    trovaValore(
      tutteStatistiche,
      [
        "pointDifferential",
        "goalDifference",
        "goalDiff",
        "gd"
      ]
    );


  const partiteGiocate =
    trovaValore(
      tutteStatistiche,
      [
        "gamesPlayed",
        "played",
        "gp"
      ]
    );


  const percentualeVittorie =
    trovaValore(
      tutteStatistiche,
      [
        "winPercent",
        "winningPct"
      ]
    );


  const forma =
    trovaValore(
      tutteStatistiche,
      [
        "form"
      ]
    );


  return {

    posizione:
      elemento?.rank ??
      elemento?.position ??
      posizione ??
      null,


    squadra: {

      id:
        team.id ||
        null,

      nome:
        team.displayName ||
        team.name ||
        null,

      nome_breve:
        team.shortDisplayName ||
        team.shortName ||
        null,

      abbreviazione:
        team.abbreviation ||
        null,

      logo:
        team.logo ||
        team.logos?.[0]?.href ||
        null

    },


    punti,

    partite_giocate:
      partiteGiocate,

    vittorie,

    pareggi,

    sconfitte,

    gol_fatti:
      golFatti,

    gol_subiti:
      golSubiti,

    differenza_reti:
      differenzaReti,

    percentuale_vittorie:
      percentualeVittorie,

    forma,


    statistiche_originali:
      tutteStatistiche

  };

}


function estraiRighe(data) {

  const righe = [];


  function cerca(obj) {

    if (!obj || typeof obj !== "object") {
      return;
    }


    if (Array.isArray(obj.entries)) {

      for (
        const entry
        of obj.entries
      ) {

        righe.push(entry);

      }

    }


    if (Array.isArray(obj.standings)) {

      for (
        const standing
        of obj.standings
      ) {

        if (
          Array.isArray(
            standing.entries
          )
        ) {

          for (
            const entry
            of standing.entries
          ) {

            righe.push(entry);

          }

        }

      }

    }


    if (Array.isArray(obj.children)) {

      for (
        const child
        of obj.children
      ) {

        cerca(child);

      }

    }

  }


  cerca(data);


  return righe;

}


export default async function handler(
  req,
  res
) {

  try {

    // ========================================
    // PARAMETRI
    // ========================================

    const {
      league = "ita.1",
      season,
      seasontype = "2"
    } = req.query;


    const params = {

      seasontype

    };


    if (season) {

      params.season =
        season;

    }


    // ========================================
    // RECUPERO CLASSIFICA ESPN
    // ========================================

    const data =
      await espnFetchV2(
        league,
        "standings",
        params
      );


    // ========================================
    // ESTRAZIONE RIGHE
    // ========================================

    const entries =
      estraiRighe(data);


    // ========================================
    // NORMALIZZAZIONE
    // ========================================

    const classifica =
      entries.map(
        (entry, index) =>
          normalizzaSquadraClassifica(
            entry,
            index + 1
          )
      );


    // ========================================
    // COMO
    // ========================================

    const como =
      classifica.find(
        (elemento) =>
          elemento.squadra.nome
            ?.toLowerCase()
            .includes("como")
      ) ||
      null;


    // ========================================
    // RISPOSTA
    // ========================================

    res.status(200).json({

      success: true,

      source: "ESPN",

      league,

      season:
        season ||
        null,

      seasontype,


      totale:
        classifica.length,


      classifica,


      como,


      dati_originali:
        data

    });


  } catch (error) {

    console.error(
      "Errore API classifica:",
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
