import { setPendingCommand } from "../../lib/kv";

const SYSTEM_PROMPT = `Tu es un assistant specialise en developpement Roblox (Luau).
On te donne une indication en francais decrivant une fonctionnalite de jeu a creer.
Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown, au format exact :
{
  "explication": "courte explication en francais de ce que fait le script",
  "instance_path": "chemin ou creer le script, ex: ServerScriptService/MonScript",
  "script_type": "Script" ou "LocalScript" ou "ModuleScript",
  "code": "le code Luau complet, en texte brut avec des \\n pour les retours a la ligne"
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode non autorisee" });
  }

  const { instruction } = req.body || {};
  if (!instruction || typeof instruction !== "string") {
    return res.status(400).json({ error: "Le champ 'instruction' est requis" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY manquante sur le serveur" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: instruction }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Erreur API Claude", detail: errText });
    }

    const data = await response.json();
    const rawText = data.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: "Reponse IA non parsable", raw: rawText });
    }

    const command = {
      id: Date.now().toString(),
      instruction,
      ...parsed,
      created_at: new Date().toISOString(),
    };

    await setPendingCommand(command);

    return res.status(200).json({ ok: true, command });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur", detail: String(err) });
  }
}
