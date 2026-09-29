import { espnFetch } from "./espn.js";

export async function trovaComo() {
  const data = await espnFetch(
    "ita.1",
    "teams"
  );

  const teams =
    data.sports?.[0]?.leagues?.[0]?.teams || [];

  const como = teams.find((item) => {
    const team = item.team;

    return (
      team?.displayName
        ?.toLowerCase()
        .includes("como") ||
      team?.shortDisplayName
        ?.toLowerCase()
        .includes("como") ||
      team?.abbreviation
        ?.toLowerCase() === "com"
    );
  });

  if (!como?.team?.id) {
    throw new Error(
      "Como non trovato nell'elenco delle squadre ESPN"
    );
  }

  return como.team;
}
