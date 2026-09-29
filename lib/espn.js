const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

export async function espnFetch(league, resource, params = {}) {
  const url = new URL(`${ESPN_BASE}/${league}/${resource}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN HTTP ${response.status}: ${response.statusText}`
    );
  }

  return await response.json();
}
