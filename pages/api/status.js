import { setStatus, getStatus, getStatusHistory } from "../../lib/kv";

function checkSecret(req) {
  const auth = req.headers["x-site-secret"];
  return auth && auth === process.env.SITE_SECRET;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Le front du site vient lire le dernier statut + historique (pas besoin du secret ici,
    // c'est juste de la lecture pour l'affichage)
    const status = await getStatus();
    const history = await getStatusHistory();
    return res.status(200).json({ status, history });
  }

  if (req.method === "POST") {
    if (!checkSecret(req)) {
      return res.status(401).json({ error: "Secret invalide" });
    }

    const { command_id, success, message, game_content } = req.body || {};

    const status = {
      command_id: command_id || null,
      success: !!success,
      message: message || "",
      game_content: game_content || null,
      received_at: new Date().toISOString(),
    };

    await setStatus(status);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Methode non autorisee" });
}
