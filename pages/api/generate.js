import { setPendingCommand } from "../../lib/kv";

const SYSTEM_PROMPT = `Tu es un assistant specialise en developpement Roblox (Luau).
On te donne une indication en francais decrivant ce qu'il faut ajouter/creer dans un jeu Roblox
(cela peut etre des Parts, des Models, des Scripts, des Sounds, etc, ou une combinaison).

Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown, sans backticks,
au format exact suivant :

{
  "explication": "courte explication en francais de ce qui va etre cree",
  "instances": [
    {
      "class_name": "Part",
      "path": "Workspace/NomDeLObjet",
      "properties": {
        "Size": {"x": 4, "y": 1, "z": 4},
        "Position": {"x": 0, "y": 5, "z": 0},
        "Anchored": true,
        "BrickColor": "Bright blue",
        "Material": "Plastic"
      }
    },
    {
      "class_name": "Script",
      "path": "Workspace/NomDeLObjet/MonScript",
      "properties": {
        "Source": "-- code Luau complet ici, avec de vrais retours a la ligne"
      }
    }
  ]
}

Regles importantes :
- "instances" est une LISTE, tu peux mettre autant d'elements que necessaire (un Part seul, un Script seul, un Part + un Script dedans, un Model avec plusieurs parts, etc).
- "path" est le chemin complet ou creer l'objet, en partant de Workspace, ServerScriptService, ServerStorage, StarterGui, StarterPack, ou Lighting selon le cas. Le dernier element du chemin est le Name de l'objet. Les dossiers/parents intermediaires qui n'existent pas seront crees automatiquement comme des Folder ou Model.
- "class_name" doit etre une vraie classe Roblox : Part, WedgePart, MeshPart, Model, Script, LocalScript, ModuleScript, Sound, SpotLight, PointLight, Decal, SurfaceGui, TextLabel, etc.
- Pour les proprietes de type Vector3 (Size, Position), utilise {"x":.., "y":.., "z":..}.
- Pour Color3, utilise {"r":.., "g":.., "b":..} avec des valeurs entre 0 et 1.
- Pour BrickColor, utilise le nom Roblox standard en string (ex: "Bright blue", "Really black").
- Pour un Script/LocalScript/ModuleScript qui doit executer du code, mets le code Luau complet dans la propriete "Source", avec de vrais "\\n" pour les retours a la ligne.
- Si une Part doit avoir un script a l'interieur (comportement local a cette part), mets le path du script sous celui de la part (ex: Workspace/Porte puis Workspace/Porte/ScriptOuverture), le script utilisera alors script.Parent pour reference la part.
- Ne mets jamais de commentaires ou de texte hors du JSON.
- Reponds avec UNIQUEMENT le JSON, rien d'autre, pas de phrase d'introduction, pas de balises markdown.`;

const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3-0324:free";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode non autorisee" });
  }

  const { instruction } = req.body || {};
  if (!instruction || typeof instruction !== "string") {
    return res.status(400).json({ error: "Le champ 'instruction' est requis" });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY manquante sur le serveur" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.4,
        max_tokens: 3000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: instruction },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Erreur API OpenRouter", detail: errText });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: "Reponse IA non parsable", raw: rawText });
    }

    if (!Array.isArray(parsed.instances)) {
      return res.status(502).json({ error: "Reponse IA invalide: 'instances' manquant", raw: rawText });
    }

    const command = {
      id: Date.now().toString(),
      instruction,
      explication: parsed.explication,
      instances: parsed.instances,
      created_at: new Date().toISOString(),
    };

    await setPendingCommand(command);

    return res.status(200).json({ ok: true, command });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur", detail: String(err) });
  }
}
