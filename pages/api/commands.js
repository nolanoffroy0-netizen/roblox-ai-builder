import { getPendingCommand, clearPendingCommand } from "../../lib/kv";

function checkSecret(req) {
  const auth = req.headers["x-site-secret"];
  return auth && auth === process.env.SITE_SECRET;
}

export default async function handler(req, res) {
  if (!checkSecret(req)) {
    return res.status(401).json({ error: "Secret invalide" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Methode non autorisee" });
  }

  const command = await getPendingCommand();

  if (!command) {
    return res.status(204).end();
  }

  // On retire la commande de la file : le plugin l'a recuperee,
  // il renverra son statut via /api/status.
  await clearPendingCommand();

  return res.status(200).json(command);
}
