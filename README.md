# Roblox AI Builder

Un site (deploye sur Vercel) qui genere des instances Roblox (Parts, Models,
Scripts, Sounds, etc, avec leurs proprietes) via l'IA a partir de tes
indications, et un plugin Roblox Studio qui les recupere et les cree
directement dans ton jeu, puis renvoie le statut vers le site.

## Ce que ca fait concretement

1. Tu ecris une indication sur le site ("cree une plateforme rouge qui flotte
   au-dessus du sol").
2. Le site appelle l'API Groq (gratuite) avec TA cle API et genere une liste
   d'instances a creer (pas seulement des scripts : des Parts, Models,
   Sounds... avec leurs proprietes).
3. Cette liste est mise en attente dans une base Upstash (Redis).
4. Le plugin, ouvert dans Roblox Studio, va la chercher toutes les 5 secondes
   et cree reellement chaque instance dans ton jeu (Explorer de Studio).
5. Le plugin renvoie un statut au site (succes ou erreur), affiche en direct.

## Limites a connaitre

- Roblox Studio doit etre **ouvert** avec le plugin active.
- Une seule commande en attente a la fois (suffisant pour un usage perso).
- L'IA peut se tromper sur des demandes complexes ou ambigues : reste precis
  dans tes indications.

## 1. Deployer le site sur Vercel

1. Cree un repo GitHub avec ce dossier, importe-le dans Vercel.
2. Dans **Storage**, ajoute une base **Upstash (Redis)**, connecte-la au
   projet : ca ajoute automatiquement `KV_REST_API_URL` et
   `KV_REST_API_TOKEN`.
3. Dans **Settings > Environment Variables**, ajoute :
   - `GROQ_API_KEY` : ta cle API Groq (gratuite, console.groq.com)
   - `SITE_SECRET` : une chaine aleatoire longue
4. Deploie.

## 2. Installer le plugin dans Roblox Studio

1. Ouvre `roblox-plugin/RobloxAIPlugin.lua`, remplace `SITE_URL` et
   `SITE_SECRET` par les tiens (le secret doit etre identique a celui sur
   Vercel).
2. Copie le fichier dans le dossier des plugins :
   - Windows : `%LOCALAPPDATA%\Roblox\Plugins`
   - Mac : `~/Documents/Roblox/Plugins`
3. Relance Studio, active **Allow HTTP Requests** dans
   **Game Settings > Security**.
4. Clique sur le bouton **AI Builder** dans l'onglet Plugins pour activer la
   connexion.

## 3. Utilisation

Tape une indication precise sur le site, ex : *"cree un mur rouge de 10 sur 5
avec une lumiere au milieu"* ou *"cree une porte qui s'ouvre quand un joueur
la touche"*. Le plugin cree les instances demandees dans les ~5 secondes.

## Structure du projet

```
pages/
  index.js            -> interface web
  api/generate.js      -> genere la liste d'instances via Groq
  api/commands.js       -> le plugin vient chercher la commande en attente
  api/status.js          -> le plugin renvoie son statut
lib/kv.js                -> stockage via l'API REST Upstash
roblox-plugin/
  RobloxAIPlugin.lua     -> plugin Roblox Studio (a configurer et installer)
```
