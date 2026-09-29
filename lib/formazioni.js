function normalizzaGiocatore(player) {
  const atleta = player.athlete || player;

  return {
    id: atleta.id || null,

    nome:
      atleta.displayName ||
      atleta.fullName ||
      atleta.shortName ||
      null,

    nome_breve:
      atleta.shortName ||
      null,

    numero:
      atleta.jersey ||
      player.jersey ||
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
      null,

    titolare:
      player.starter === true ||
      player.startPosition !== undefined,

    posizione_campo:
      player.position?.displayName ||
      player.position?.name ||
      null,

    posizione_abbreviazione:
      player.position?.abbreviation ||
      null
  };
}


function estraiModulo(players) {
  const titolari = players.filter(
    (player) =>
      player.starter === true ||
      player.startPosition !== undefined
  );

  const difensori = titolari.filter((player) => {
    const posizione =
      player.athlete?.position?.abbreviation ||
      player.position?.abbreviation ||
      "";

    return ["D", "CB", "FB", "LB", "RB", "WB"].includes(
      posizione.toUpperCase()
    );
  }).length;

  const centrocampisti = titolari.filter((player) => {
    const posizione =
      player.athlete?.position?.abbreviation ||
      player.position?.abbreviation ||
      "";

    return ["M", "CM", "DM", "AM", "MF"].includes(
      posizione.toUpperCase()
    );
  }).length;

  const attaccanti = titolari.filter((player) => {
    const posizione =
      player.athlete?.position?.abbreviation ||
      player.position?.abbreviation ||
      "";

    return ["F", "FW", "ST", "CF", "W", "LW", "RW"].includes(
      posizione.toUpperCase()
    );
  }).length;

  if (!titolari.length) {
    return null;
  }

  return {
    difensori,
    centrocampisti,
    attaccanti
  };
}


export function normalizzaFormazioni(summary) {
  const players =
    summary?.boxscore?.players ||
    [];

  const squadre = [];

  for (const blocco of players) {
    const team =
      blocco.team ||
      {};

    const giocatori =
      blocco.statistics ||
      blocco.players ||
      [];

    const lista =
      giocatori.map(normalizzaGiocatore);

    squadre.push({
      squadra: {
        id: team.id || null,
        nome: team.displayName || null,
        abbreviazione: team.abbreviation || null,
        logo: team.logo || null
      },

      titolari: lista.filter(
        (giocatore) =>
          giocatore.titolare
      ),

      panchina: lista.filter(
        (giocatore) =>
          !giocatore.titolare
      ),

      tutti: lista,

      modulo: estraiModulo(
        giocatori
      )
    });
  }

  return squadre;
}
