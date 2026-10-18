// IL PIANETA COMASCO — API unica per Vercel
// File: api/[...route].js
// Node.js 20+. Nessuna API key necessaria per i feed pubblici.
// I dati non disponibili vengono indicati come null/[]: non vengono inventati.

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
const COMPETITIONS = [
  { id: "ita.1", name: "Serie A" },
  { id: "ita.2", name: "Serie B" },
  { id: "ita.coppa_italia", name: "Coppa Italia" },
  { id: "uefa.champions", name: "Champions League" },
  { id: "uefa.europa", name: "Europa League" },
  { id: "uefa.europa.conf", name: "Conference League" }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  const u = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const route = (u.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "") || "health").toLowerCase();
  const q = u.searchParams;
  const league = q.get("league") || "ita.1";
  const teamId = q.get("teamId") || q.get("team") || "";
  const eventId = q.get("id") || q.get("eventId") || "";
  try {
    let out;
    if (route === "health") {
      out = { ok:true, service:"Il Pianeta Comasco API", version:"3.0.0", generatedAt:new Date().toISOString(), endpoints:endpoints() };
    } else if (route === "configurazione" || route === "config") {
      out = { service:"Il Pianeta Comasco API", competitions:COMPETITIONS,
        teams:[{name:"Como prima squadra maschile",league:"ita.1"},{name:"Como Primavera",league:"ID da verificare nel feed ESPN"},{name:"Como Women",league:"ID da verificare nel feed ESPN"}],
        sources:{matches:"ESPN public site API",news:["ESPN news","RSS pubblici raggiungibili senza login"]},
        policy:"Campi non pubblicati dalla fonte sono null/[]; nessun dato viene inventato." };
    } else if (route === "competizioni" || route === "coppe") {
      out = { competitions:COMPETITIONS };
    } else if (route === "partite" || route === "scoreboard" || route === "calendario" || route === "programma") {
      out = await scoreboard(league, { dates:q.get("dates"), season:q.get("season"), limit:q.get("limit") });
    } else if (route === "squadre") {
      const d = await get(`${ESPN}/${enc(league)}/teams`);
      const teams = d.sports?.[0]?.leagues?.[0]?.teams || [];
      out = { source:"ESPN", league, count:teams.length, teams:teams.map(x=>x.team).filter(Boolean) };
    } else if (route === "classifica" || route === "standings") {
      out = await standings(league);
    } else if (route === "rosa" || route === "giocatori") {
      const id = teamId || await findComoId(league);
      if (!id) throw new Error("ID squadra non trovato. Usa /api/squadre?league=ita.1 e poi passa teamId.");
      out = await roster(league,id);
    } else if (route === "indisponibili" || route === "infortuni") {
      const id = teamId || await findComoId(league);
      if (!id) throw new Error("ID squadra non trovato. Passa ?teamId=ID_ESPN.");
      const d = await get(`${ESPN}/${enc(league)}/teams/${enc(id)}/injuries`);
      const injuries = d.injuries || d.items || [];
      out = {source:"ESPN",league,teamId:id,count:injuries.length,injuries,note:injuries.length ? null : "Nessuna indisponibilità pubblicata da ESPN; ciò non conferma che tutti siano disponibili.",raw:d};
    } else if (route === "statistiche" || route === "statistiche-squadra") {
      const id = teamId || await findComoId(league);
      if (!id) throw new Error("ID squadra non trovato. Passa ?teamId=ID_ESPN.");
      out = await teamStats(league,id);
    } else if (route === "partita" || route === "evento" || route === "match" || route === "formazioni" || route === "lineups") {
      if (!eventId) throw new Error("Parametro mancante: ?id=ID_EVENTO_ESPN");
      const d = await get(`${ESPN}/${enc(league)}/summary?event=${enc(eventId)}`);
      out = route === "formazioni" || route === "lineups"
        ? {source:"ESPN",league,eventId,lineups:d.rosters||d.lineups||[],boxscore:d.boxscore||null,officials:d.gameInfo?.officials||d.officials||[],gameInfo:d.gameInfo||null,raw:d}
        : {source:"ESPN",league,eventId,header:d.header||null,gameInfo:d.gameInfo||null,boxscore:d.boxscore||null,plays:d.plays||null,leaders:d.leaders||null,scoringPlays:d.scoringPlays||null,rosters:d.rosters||null,injuries:d.injuries||null,raw:d};
    } else if (route === "scontri-diretti" || route === "h2h") {
      const a=q.get("team1"), b=q.get("team2");
      if (!a || !b) throw new Error("Parametri richiesti: ?team1=ID_ESPN&team2=ID_ESPN");
      const d=await scoreboard(league,{limit:200});
      const events=d.events.filter(e=>{const ids=(e.competitors||[]).map(c=>String(c.id));return ids.includes(String(a))&&ids.includes(String(b));});
      out={source:"ESPN",league,team1:a,team2:b,count:events.length,events};
    } else if (route === "notizie" || route === "news" || route === "como/notizie") {
      out = await news(q.get("team") || "Como", q.get("limit") || 30);
    } else if (route.startsWith("como/") || route === "como") {
      const sub=route.split("/")[1]||"riepilogo";
      const id=teamId||await findComoId(league);
      if (!id) throw new Error("Como non trovato nel feed ESPN. Verifica /api/squadre?league=ita.1.");
      if (sub==="partite") {
        const d=await scoreboard(league,{limit:200,season:q.get("season")});
        out={...d,events:d.events.filter(e=>e.competitors.some(c=>String(c.id)===String(id)||(c.name||"").toLowerCase().includes("como")))};
      } else if (sub==="rosa"||sub==="giocatori") out=await roster(league,id);
      else if (sub==="indisponibili"||sub==="infortuni") {
        const d=await get(`${ESPN}/${enc(league)}/teams/${enc(id)}/injuries`);
        out={source:"ESPN",league,teamId:id,injuries:d.injuries||d.items||[],raw:d};
      } else if (sub==="statistiche") out=await teamStats(league,id);
      else if (sub==="classifica") out=await standings(league);
      else {
        const results=await Promise.allSettled([
          scoreboard(league,{limit:200}), roster(league,id), standings(league),
          get(`${ESPN}/${enc(league)}/teams/${enc(id)}/injuries`), teamStats(league,id)
        ]);
        out={team:"Como",teamId:id,league,generatedAt:new Date().toISOString(),
          partite:value(results[0]),rosa:value(results[1]),classifica:value(results[2]),
          indisponibili:value(results[3]),statistiche:value(results[4]),
          note:"Le singole sezioni possono riportare un errore se ESPN non pubblica quel dato."};
      }
    } else if (route === "tutto") {
      const leagues=(q.get("leagues")||COMPETITIONS.map(x=>x.id).join(",")).split(",").map(x=>x.trim()).filter(Boolean);
      const entries=await Promise.all(leagues.map(async id=>[id,await safe(async()=>({
        partite:await scoreboard(id,{limit:q.get("limit")||100,season:q.get("season")}),
        classifica:await standings(id),
        squadre:await teamList(id)
      }))]));
      out={generatedAt:new Date().toISOString(),competitions:Object.fromEntries(entries)};
    } else {
      res.statusCode=404; out={error:"Endpoint non trovato",requested:route,endpoints:endpoints()};
    }
    res.setHeader("Content-Type","application/json; charset=utf-8");
    return res.end(JSON.stringify(out,null,2));
  } catch (e) {
    res.statusCode=502;
    res.setHeader("Content-Type","application/json; charset=utf-8");
    return res.end(JSON.stringify({error:"Recupero dati non riuscito",message:String(e.message||e),endpoint:route,league,time:new Date().toISOString()},null,2));
  }
}
function endpoints(){return ["/api/health","/api/configurazione","/api/competizioni","/api/partite?league=ita.1","/api/calendario?league=ita.1","/api/squadre?league=ita.1","/api/classifica?league=ita.1","/api/rosa?league=ita.1&teamId=ID","/api/indisponibili?league=ita.1&teamId=ID","/api/statistiche?league=ita.1&teamId=ID","/api/partita?league=ita.1&id=EVENT_ID","/api/formazioni?league=ita.1&id=EVENT_ID","/api/scontri-diretti?league=ita.1&team1=ID&team2=ID","/api/notizie?team=Como","/api/como/riepilogo?league=ita.1","/api/como/partite?league=ita.1","/api/como/rosa?league=ita.1","/api/como/indisponibili?league=ita.1","/api/como/statistiche?league=ita.1","/api/tutto"];}
function enc(x){return encodeURIComponent(String(x));}
async function get(url){
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
  try {const r=await fetch(url,{signal:controller.signal,headers:{"User-Agent":"IlPianetaComasco/3.0","Accept":"application/json, text/plain, */*"}});
    if(!r.ok)throw new Error(`HTTP ${r.status} da ${new URL(url).hostname}`);
    return await r.json();
  } finally {clearTimeout(timer);}
}
async function scoreboard(league,opts={}){
  const p=new URLSearchParams(); if(opts.dates)p.set("dates",opts.dates);if(opts.season)p.set("season",opts.season);
  p.set("limit",String(Math.max(1,Math.min(200,Number(opts.limit)||100))));
  const d=await get(`${ESPN}/${enc(league)}/scoreboard?${p}`);
  const events=(d.events||[]).map(e=>{
    const c=e.competitions?.[0]||{};
    return {id:e.id||null,uid:e.uid||null,name:e.name||null,shortName:e.shortName||null,date:e.date||null,status:e.status||null,
      competition:e.league?.name||c.league?.name||null,season:e.season||null,venue:c.venue||null,attendance:c.attendance??null,
      competitors:(c.competitors||[]).map(t=>({id:t.id||t.team?.id||null,homeAway:t.homeAway||null,team:t.team||null,name:t.team?.displayName||t.team?.name||null,score:t.score??null,winner:t.winner??null,form:t.form||null,records:t.records||[],statistics:t.statistics||[],linescores:t.linescores||[],raw:t})),
      broadcasts:c.broadcasts||[],notes:c.notes||[],links:e.links||[],raw:e};
  });
  return {source:"ESPN",league,count:events.length,events,day:d.day||null,leagues:d.leagues||[],note:"ESPN può restituire una finestra di calendario limitata. Per un giorno usa ?dates=YYYYMMDD."};
}
async function teamList(league){const d=await get(`${ESPN}/${enc(league)}/teams`);const teams=d.sports?.[0]?.leagues?.[0]?.teams||[];return {source:"ESPN",league,count:teams.length,teams:teams.map(x=>x.team).filter(Boolean)};}
async function findComoId(league){const d=await teamList(league);const t=d.teams.find(x=>(x.displayName||x.name||"").toLowerCase()==="como")||d.teams.find(x=>(x.displayName||x.name||"").toLowerCase().includes("como"));return t?.id?String(t.id):null;}
async function roster(league,id){
  let last;
  for(const url of [`${ESPN}/${enc(league)}/teams/${enc(id)}/roster`,`${ESPN}/${enc(league)}/teams/${enc(id)}?enable=roster`]){
    try {const d=await get(url);let a=d.athletes||d.team?.athletes||d.roster?.athletes||[];a=a.flatMap(x=>x.items||x.athletes||[x]);
      return {source:"ESPN",league,teamId:String(id),team:d.team||null,count:a.length,players:a.map(x=>({id:x.id||null,name:x.fullName||x.displayName||x.name||null,position:x.position?.displayName||x.position||null,jersey:x.jersey||null,age:x.age??null,height:x.height??null,weight:x.weight??null,nationality:x.citizenship||x.nationality||null,headshot:x.headshot?.href||x.headshot||null,status:x.status||null,statistics:x.statistics||null,raw:x})),raw:d};
    } catch(e){last=e;}
  } throw last||new Error("Rosa non disponibile");
}
async function standings(league){
  let last;
  for(const url of [`${ESPN_V2}/${enc(league)}/standings`,`${ESPN}/${enc(league)}/standings`]){
    try {const d=await get(url);const s=d.children||d.standings?.entries||d.entries||[];return {source:"ESPN",league,standings:s,raw:d,note:s.length?null:"ESPN non ha restituito una classifica strutturata per questa competizione."};}catch(e){last=e;}
  }throw last||new Error("Classifica non disponibile");
}
async function teamStats(league,id){
  let last;
  for(const url of [`${ESPN}/${enc(league)}/teams/${enc(id)}/statistics`,`${ESPN}/${enc(league)}/teams/${enc(id)}?enable=stats`]){
    try{const d=await get(url);return {source:"ESPN",league,teamId:String(id),statistics:d.statistics||d.stats||null,record:d.record||null,raw:d};}catch(e){last=e;}
  }throw last||new Error("Statistiche non disponibili");
}
async function news(team,limit){
  const sources=[
    {name:"ESPN",url:`${ESPN}/ita.1/news`,type:"json"},
    {name:"Gazzetta dello Sport",url:"https://www.gazzetta.it/rss/Calcio.xml",type:"rss"},
    {name:"Sky Sport",url:"https://sport.sky.it/rss/sport_calcio.xml",type:"rss"},
    {name:"Tuttomercatoweb",url:"https://www.tuttomercatoweb.com/rss/?section=calcio",type:"rss"}
  ];
  const results=await Promise.allSettled(sources.map(async s=>{
    const r=await fetch(s.url,{headers:{"User-Agent":"Mozilla/5.0 IlPianetaComasco/3.0","Accept":"application/json, application/rss+xml, application/xml, */*"}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    if(s.type==="json"){const d=await r.json();return (d.articles||[]).map(a=>({source:s.name,title:a.headline||a.title||null,summary:a.description||a.summary||null,date:a.published||a.lastModified||null,url:a.links?.web?.href||a.link||null,image:a.images?.[0]?.url||null}));}
    const xml=await r.text();if(!/<item\b|<entry\b/i.test(xml))throw new Error("Feed RSS non riconosciuto");
    return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m=>{
      const x=m[0],get=(...tags)=>{for(const tag of tags){const z=x.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));if(z)return decode(z[1].replace(/<!\[CDATA\[|\]\]>/g,"").trim());}return null;};
      return {source:s.name,title:get("title"),summary:strip(get("description","summary","content:encoded")||""),date:get("pubDate","published","updated","dc:date"),url:get("link")||(x.match(/<link[^>]*href=["']([^"']+)/i)||[])[1]||null,image:(x.match(/<enclosure[^>]*url=["']([^"']+)/i)||[])[1]||(x.match(/<media:content[^>]*url=["']([^"']+)/i)||[])[1]||null};
    }).filter(a=>a.title&&a.url);
  }));
  const all=[];results.forEach(r=>{if(r.status==="fulfilled")all.push(...r.value);});
  const needle=String(team||"").toLowerCase(),map=new Map();
  for(const a of all){if(needle&&needle!=="tutte"&&!`${a.title||""} ${a.summary||""}`.toLowerCase().includes(needle))continue;const k=(a.url||a.title||"").toLowerCase();if(k&&!map.has(k))map.set(k,a);}
  const articles=[...map.values()].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,Math.max(1,Math.min(100,Number(limit)||30)));
  return {generatedAt:new Date().toISOString(),query:team,count:articles.length,articles,sources:results.map((r,i)=>({name:sources[i].name,ok:r.status==="fulfilled",error:r.status==="rejected"?String(r.reason?.message||r.reason):null})),note:"I feed possono essere bloccati o cambiare formato. OneFootball non è incluso perché non c'è un'API pubblica universale garantita; serve un feed autorizzato."};
}
function decode(s){return String(s||"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function strip(s){return decode(s).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,700);}
function value(r){return r.status==="fulfilled"?r.value:{error:String(r.reason?.message||r.reason)};}
async function safe(fn){try{return await fn();}catch(e){return {error:String(e.message||e)};}}
