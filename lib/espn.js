const ESPN_SITE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const ESPN_V2_BASE =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const ESPN_CORE_BASE =
  "https://sports.core.api.espn.com/v2/sports/soccer/leagues";


async function richiesta(url, nome) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${nome} HTTP ${response.status}: ${response.statusText}`
    );
  }

  return await response.json();
}


function aggiungiParametri(url, params = {}) {
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}


export async function espnFetch(
  league,
  resource,
  params = {}
) {
  const url = new URL(
    `${ESPN_SITE_BASE}/${league}/${resource}`
  );

  aggiungiParametri(url, params);

  return await richiesta(url, "ESPN");
}


export async function espnFetchV2(
  league,
  resource,
  params = {}
) {
  const url = new URL(
    `${ESPN_V2_BASE}/${league}/${resource}`
  );

  aggiungiParametri(url, params);

  return await richiesta(url, "ESPN V2");
}


export async function espnCoreFetch(
  league,
  resource,
  params = {}
) {
  const url = new URL(
    `${ESPN_CORE_BASE}/${league}/${resource}`
  );

  aggiungiParametri(url, params);

  return await richiesta(url, "ESPN Core");
}
