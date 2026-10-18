IL PIANETA COMASCO — API UNICA

FILE PRINCIPALE: api/[...route].js

INSTALLAZIONE:
1. Carica i file di questa cartella nel repository GitHub.
2. In Vercel collega il repository; Framework Preset: Other; Node.js 20+.
3. Dopo il deploy prova https://TUO-DOMINIO/api/health

ENDPOINT PRINCIPALI:
- /api/health
- /api/configurazione
- /api/competizioni
- /api/partite?league=ita.1&limit=100
- /api/partite?league=ita.1&dates=20261018
- /api/squadre?league=ita.1
- /api/classifica?league=ita.1
- /api/rosa?league=ita.1&teamId=ID_ESPN
- /api/indisponibili?league=ita.1&teamId=ID_ESPN
- /api/statistiche?league=ita.1&teamId=ID_ESPN
- /api/partita?league=ita.1&id=ID_EVENTO_ESPN
- /api/formazioni?league=ita.1&id=ID_EVENTO_ESPN
- /api/scontri-diretti?league=ita.1&team1=ID1&team2=ID2
- /api/notizie?team=Como&limit=30
- /api/como/riepilogo?league=ita.1
- /api/como/partite?league=ita.1
- /api/como/rosa?league=ita.1
- /api/como/indisponibili?league=ita.1
- /api/como/statistiche?league=ita.1
- /api/tutto

LIMITI REALI:
Questo è il codice completo per gli endpoint elencati, ma non esiste una fonte pubblica che garantisca tutti i dati di ogni competizione. ESPN può non pubblicare formazioni, infortuni, rose storiche, statistiche o campionati Primavera/femminili. I feed RSS possono bloccare le richieste e vengono segnalati in sources. OneFootball non è interrogato perché non è disponibile un'API pubblica universale garantita. I dati mancanti non sono inventati. Questa API non scrive ancora su Google Sheets e non integra direttamente Base44: è il backend dati da collegare a quei servizi.
