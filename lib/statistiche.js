function trovaStatisticheTeam(summary) {
  const competition = summary?.header?.competitions?.[0];

  if (!competition) {
    return [];
  }

  return (competition.competitors || []).map((team) => ({
    team_id: team.team?.id || null,
    team_nome: team.team?.displayName || null,
    team_logo: team.team?.logo || null,
    casa_trasferta: team.homeAway || null,
    statistiche: team.statistics || []
  }));
}


function trovaFormazioni(summary) {
  const boxscore = summary?.boxscore;

  if (!boxscore) {
    return [];
  }

  return boxscore.players || [];
}


export function estraiDatiTecnici(summary) {
  return {
    statistiche_squadre: trovaStatisticheTeam(summary),
    formazioni: trovaFormazioni(summary)
  };
}
