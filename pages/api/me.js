import { createSessionCookie } from "../../../lib/session";

const TOKEN_URL = "https://apis.roblox.com/oauth/v1/token";
const USERINFO_URL = "https://apis.roblox.com/oauth/v1/userinfo";

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const idx = c.indexOf("=");
      if (idx === -1) return [c.trim(), ""];
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    })
  );
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`Connexion Roblox refusee ou annulee (${error}).`);
  }

  const cookies = parseCookies(req);
  if (!code || !state || state !== cookies.oauth_state) {
    return res.status(400).send("Requete invalide (state manquant ou incorrect).");
  }

  const clientId = process.env.ROBLOX_CLIENT_ID;
  const clientSecret = process.env.ROBLOX_CLIENT_SECRET;
  const redirectUri = process.env.ROBLOX_REDIRECT_URI;

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return res.status(502).send(`Echec de l'echange du code Roblox : ${detail}`);
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      const detail = await userRes.text();
      return res.status(502).send(`Echec de recuperation du profil Roblox : ${detail}`);
    }

    const profile = await userRes.json();

    const user = {
      id: profile.sub,
      username: profile.preferred_username || profile.nickname || profile.name,
      picture: profile.picture || null,
    };

    res.setHeader("Set-Cookie", [
      "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      createSessionCookie(user),
    ]);

    res.redirect(302, "/");
  } catch (err) {
    res.status(500).send(`Erreur serveur pendant la connexion Roblox : ${String(err)}`);
  }
}
