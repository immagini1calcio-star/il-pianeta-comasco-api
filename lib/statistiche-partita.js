function normalizzaValore(stat) {
  return {
    nome: stat.name || null,
    descrizione: stat.displayName || null,
    valore: stat.value ?? null,
    displayValue: stat.displayValue || null,
    abbreviazione: stat.abbreviation || null
  };
}


export function normalizzaStatisticheSquadra(data) {
  const items =
    data?.items ||
    data?.statistics ||
    [];

  return items.map(normalizzaValore);
}


export function creaStatistichePartita(
  statisticheCasa,
  statisticheTrasferta
) {
  return {
    casa: statisticheCasa,
    trasferta: statisticheTrasferta
  };
}
