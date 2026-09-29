function trovaTipoEvento(play) {
  const testo = [
    play.text,
    play.shortText,
    play.type?.text,
    play.type?.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    testo.includes("goal") ||
    testo.includes("gol") ||
    testo.includes("score")
  ) {
    return "gol";
  }

  if (
    testo.includes("yellow card") ||
    testo.includes("cartellino giallo")
  ) {
    return "cartellino_giallo";
  }

  if (
    testo.includes("red card") ||
    testo.includes("cartellino rosso")
  ) {
    return "cartellino_rosso";
  }

  if (
    testo.includes("substitution") ||
    testo.includes("sostituzione")
  ) {
    return "sostituzione";
  }

  if (
    testo.includes("penalty") ||
    testo.includes("rigore")
  ) {
    return "rigore";
  }

  return "altro";
}


function estraiGiocatori(play) {
  return (play.athletesInvolved || []).map((player) => ({
    id: player.id || null,
    nome: player.displayName || player.fullName || null,
    posizione: player.position?.abbreviation || null,
    numero: player.jersey || null
  }));
}


export function normalizzaEventi(summary) {
  const plays = summary?.plays || [];

  return plays.map((play, index) => ({
    id: play.id || `${index}`,

    minuto: play.clock?.displayValue || null,

    periodo: play.period?.number || null,

    tipo: trovaTipoEvento(play),

    descrizione: play.text || play.shortText || null,

    giocatori: estraiGiocatori(play),

    squadra: play.team
      ? {
          id: play.team.id || null,
          nome: play.team.displayName || null,
          abbreviazione: play.team.abbreviation || null,
          logo: play.team.logo || null
        }
      : null,

    assist: play.assist
      ? {
          id: play.assist.id || null,
          nome:
            play.assist.displayName ||
            play.assist.fullName ||
            null
        }
      : null,

    home_score: play.homeScore ?? null,

    away_score: play.awayScore ?? null
  }));
}


export function separaEventi(eventi) {
  return {
    gol: eventi.filter(
      (evento) => evento.tipo === "gol"
    ),

    cartellini_gialli: eventi.filter(
      (evento) => evento.tipo === "cartellino_giallo"
    ),

    cartellini_rossi: eventi.filter(
      (evento) => evento.tipo === "cartellino_rosso"
    ),

    sostituzioni: eventi.filter(
      (evento) => evento.tipo === "sostituzione"
    ),

    rigori: eventi.filter(
      (evento) => evento.tipo === "rigore"
    ),

    altri: eventi.filter(
      (evento) => evento.tipo === "altro"
    )
  };
}
