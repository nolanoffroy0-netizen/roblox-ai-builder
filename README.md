# Roblox AI Builder

Un site (a deployer sur Vercel) qui genere du code Luau via l'IA a partir de
tes indications, et un plugin Roblox Studio qui recupere ce code, le met dans
ton jeu, puis renvoie le statut (succes/erreur) vers le site.

## Ce que ca fait concretement

1. Tu ecris une indication sur le site ("cree une porte qui s'ouvre au clic").
2. Le site appelle l'API Claude avec TA clé API et genere un script Luau.
3. Le script est mis en attente ("file d'attente" d'une seule commande).
4. Le plugin, ouvert dans Roblox Studio, va chercher cette commande toutes les
   5 secondes, cree/modifie le script dans ton jeu.
5. Le plugin renvoie un statut au site (succes ou erreur), affiche en direct
   sur la page.

## Limites a connaitre

- **Aucune IA n'est "sans limite de tokens"**. Ce site utilise ta propre cle
  API Anthropic : les limites/couts dependent de TON compte API, pas de moi.
- Roblox Studio doit etre **ouvert** avec le plugin active pour que la
  connexion fonctionne (pas de pilotage a distance de Studio sans lui).
- Une seule commande en attente a la fois (largement suffisant pour un usage
  perso/solo).

## 1. Deployer le site sur Vercel

1. Cree un nouveau repo Git avec ce dossier, ou importe-le directement dans
   Vercel (Vercel > Add New > Project > Upload).
2. Dans Vercel, va dans **Storage > Create Database > KV** et connecte cette
   base a ton projet. Cela ajoute automatiquement `KV_REST_API_URL` et
   `KV_REST_API_TOKEN` a tes variables d'environnement.
3. Ajoute ces variables d'environnement dans **Settings > Environment
   Variables** :
   - `ANTHROPIC_API_KEY` : ta cle API Anthropic (console.anthropic.com)
   - `SITE_SECRET` : une chaine aleatoire longue (ex : genere avec
     `openssl rand -hex 32`)
4. Deploie. Ton site sera accessible a une URL du type
   `https://ton-projet.vercel.app`.

## 2. Installer le plugin dans Roblox Studio

1. Ouvre le fichier `roblox-plugin/RobloxAIPlugin.lua`.
2. Remplace :
   - `SITE_URL` par l'URL de ton site Vercel (sans slash a la fin)
   - `SITE_SECRET` par la MEME valeur que celle mise dans les variables
     d'environnement Vercel
3. Copie ce fichier dans le dossier des plugins Roblox Studio :
   - **Windows** : `%LOCALAPPDATA%\Roblox\Plugins`
   - **Mac** : `~/Documents/Roblox/Plugins`
4. Relance Roblox Studio (ou Plugins > Manage Plugins > refresh).
5. Dans ton jeu, va dans **Game Settings > Security** et active
   **Allow HTTP Requests** (sinon le plugin ne peut pas contacter ton site).
6. Un bouton "AI Builder" apparait dans l'onglet Plugins. Clique dessus pour
   activer la connexion (le bouton reste actif/surligne).

## 3. Utilisation

1. Va sur ton site Vercel.
2. Tape une indication, ex : *"cree un script qui fait clignoter une brique
   toutes les 2 secondes"*.
3. Clique sur "Generer et envoyer a Studio".
4. Dans les ~5 secondes, le plugin recupere la commande et cree le script
   dans ton jeu (visible dans l'Explorer de Studio).
5. Le statut (succes/erreur) s'affiche automatiquement sur le site.

## Structure du projet

```
pages/
  index.js           -> interface web
  api/generate.js     -> genere le code Luau via Claude, le met en attente
  api/commands.js      -> le plugin vient chercher la commande en attente
  api/status.js         -> le plugin renvoie son statut, le site l'affiche
lib/kv.js               -> stockage simple (Vercel KV)
roblox-plugin/
  RobloxAIPlugin.lua    -> plugin Roblox Studio (a configurer et installer)
```

## Ameliorations possibles (pas incluses ici, pour rester simple)

- File d'attente de plusieurs commandes au lieu d'une seule
- Historique complet des scripts generes, avec possibilite de les rejouer
- Authentification sur le site lui-meme (actuellement, le site est ouvert a
  qui a l'URL ; seul l'echange avec le plugin est protege par le secret)
