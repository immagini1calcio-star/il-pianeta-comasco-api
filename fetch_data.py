
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = "https://www.sofascore.com/api/v1"
OUTPUT = Path("risultati.json")

TEAMS = {
    "como": {"id": 2704, "name": "Como maschile"},
    "primavera": {"id": 206254, "name": "Como Primavera"},
    "femminile": {"id": 1114927, "name": "Como Women"},
}

# Intervallo prudente: il workflow gira ogni 30 minuti.
# Non aumentare il numero di richieste se Sofascore risponde 403 o 429.
ENDPOINTS = {
    "partite_precedenti": "events/last/0",
    "partite_successive": "events/next/0",
    "rosa": "players",
}

HEADERS = {
    "User-Agent": "IlPianetaComascoDataUpdater/1.0",
    "Accept": "application/json",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
}

def leggi_json(url):
    """Richiesta con timeout e tentativi limitati, senza aggirare i blocchi."""
    for tentativo in range(3):
        try:
            req = Request(url, headers=HEADERS)
            with urlopen(req, timeout=20) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}: {url}")
                return json.loads(response.read().decode("utf-8"))

        except HTTPError as exc:
            # Un 403/429 non va aggirato con richieste ripetute.
            if exc.code in (403, 429):
                print(f"Fonte non disponibile (HTTP {exc.code}): {url}")
                return None
            print(f"HTTP {exc.code}, tentativo {tentativo + 1}/3: {url}")

        except (URLError, TimeoutError, OSError, ValueError) as exc:
            print(f"Errore, tentativo {tentativo + 1}/3: {exc}")

        if tentativo < 2:
            time.sleep(2 ** (tentativo + 1))

    return None


def carica_precedente():
    if OUTPUT.exists():
        try:
            with OUTPUT.open("r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            pass
    return {}


def main():
    precedente = carica_precedente()
    vecchi_team = precedente.get("squadre", {})
    squadre = {}
    richieste_riuscite = 0
    errori = []

    for chiave, team in TEAMS.items():
        vecchio = vecchi_team.get(chiave, {})
        dati_team = dict(vecchio)
        dati_team["id"] = team["id"]
        dati_team["nome"] = team["name"]

        # Il profilo viene aggiornato solo se il dato è disponibile.
        profilo_url = f"{BASE}/team/{team['id']}"
        profilo = leggi_json(profilo_url)
        if profilo is not None:
            dati_team["profilo"] = profilo
            richieste_riuscite += 1
        else:
            errori.append(f"{chiave}: profilo non aggiornato")

        for nome, percorso in ENDPOINTS.items():
            url = f"{BASE}/team/{team['id']}/{percorso}"
            risultato = leggi_json(url)

            if risultato is not None:
                dati_team[nome] = risultato
                richieste_riuscite += 1
            else:
                # Mantiene il dato precedente, se esiste.
                if nome not in dati_team:
                    dati_team[nome] = None
                errori.append(f"{chiave}: {nome} non aggiornato")

        squadre[chiave] = dati_team

    # Non sovrascrive un archivio valido con un risultato completamente vuoto.
    if richieste_riuscite == 0 and precedente:
        raise RuntimeError(
            "Nessun dato recuperato. Archivio precedente lasciato invariato."
        )

    output = {
        "servizio": "Il Pianeta Comasco",
        "aggiornato_utc": datetime.now(timezone.utc).isoformat(),
        "fonte": "Sofascore",
        "stato": "parziale" if errori else "ok",
        "richieste_riuscite": richieste_riuscite,
        "errori": errori,
        "squadre": squadre,
    }

    tmp = OUTPUT.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    tmp.replace(OUTPUT)

    print(
        f"Archivio aggiornato. Richieste riuscite: {richieste_riuscite}; "
        f"problemi: {len(errori)}"
    )


if __name__ == "__main__":
    main()
