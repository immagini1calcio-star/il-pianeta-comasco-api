export function normalizzaPartita(event) {
  const competition = event.competitions?.[0];

  const competitors = competition?.competitors || [];

  const home = competitors.find(
    (team) => team.homeAway === "home"
  );

  const away = competitors.find(
    (team) => team.homeAway === "away"
  );

  const venue = competition?.venue;

  const status = competition?.status;

  const leaders = competition?.leaders || [];

  return {
    id: event.id || null,

    data: event.date || null,

    nome_partita: event.name || null,

    stato: {
      tipo: status?.type?.name || null,
      descrizione: status?.type?.description || null,
      dettaglio: status?.type?.detail || null,
      minuto: status?.displayClock || null
    },

    competizione: {
      nome: event.league?.name || null,
      abbreviazione: event.league?.abbreviation || null,
      stagione: event.season?.displayName || null
    },

    stadio: {
      nome: venue?.fullName || null,
      citta: venue?.address?.city || null,
      stato: venue?.address?.country || null
    },

    casa: {
      id: home?.team?.id || null,
      nome: home?.team?.displayName || null,
      nome_breve: home?.team?.shortDisplayName || null,
      abbreviazione: home?.team?.abbreviation || null,
      logo: home?.team?.logo || null,
      score: home?.score || null,
      vincitore: home?.winner ?? null
    },

    trasferta: {
      id: away?.team?.id || null,
      nome: away?.team?.displayName || null,
      nome_breve: away?.team?.shortDisplayName || null,
      abbreviazione: away?.team?.abbreviation || null,
      logo: away?.team?.logo || null,
      score: away?.score || null,
      vincitore: away?.winner ?? null
    },

    risultato: {
      casa: home?.score || null,
      trasferta: away?.score || null
    },

    leaders
  };
}
