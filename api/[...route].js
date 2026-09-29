import classifica from "../routes/classifica.js";
import comoInfo from "../routes/como-info.js";
import comoTeam from "../routes/como-team.js";
import como from "../routes/como.js";
import configurazione from "../routes/configurazione.js";
import coppe from "../routes/coppe.js";
import formazioni from "../routes/formazioni.js";
import giocatori from "../routes/giocatori.js";
import indisponibili from "../routes/indisponibili.js";
import notizie from "../routes/notizie.js";
import partita from "../routes/partita.js";
import partite from "../routes/partite.js";
import scontriDiretti from "../routes/scontri-diretti.js";
import squalificati from "../routes/squalificati.js";


const handlers = {
  "classifica": classifica,
  "como-info": comoInfo,
  "como-team": comoTeam,
  "como": como,
  "configurazione": configurazione,
  "coppe": coppe,
  "formazioni": formazioni,
  "giocatori": giocatori,
  "indisponibili": indisponibili,
  "notizie": notizie,
  "partita": partita,
  "partite": partite,
  "scontri-diretti": scontriDiretti,
  "squalificati": squalificati
};


export default async function handler(req, res) {
  try {
    const segments = req.query.route;

    const route = Array.isArray(segments)
      ? segments.join("/")
      : segments || "";

    const target = handlers[route];

    if (!target) {
      return res.status(404).json({
        success: false,
        error: "Endpoint non trovato",
        route
      });
    }

    return await target(req, res);

  } catch (error) {
    console.error("Errore API router:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Errore interno del server"
    });
  }
}
