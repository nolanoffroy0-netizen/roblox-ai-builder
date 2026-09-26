// Utilise l'API REST Upstash directement (simple, pas de librairie a installer)

const BASE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(parts) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function get(key) {
  const result = await redisCommand(["GET", key]);
  return result ? JSON.parse(result) : null;
}

async function set(key, value) {
  await redisCommand(["SET", key, JSON.stringify(value)]);
}

async function del(key) {
  await redisCommand(["DEL", key]);
}

export async function setPendingCommand(command) {
  await set("pending_command", command);
}

export async function getPendingCommand() {
  return await get("pending_command");
}

export async function clearPendingCommand() {
  await del("pending_command");
}

export async function setStatus(status) {
  await set("last_status", status);
  const history = (await get("status_history")) || [];
  history.unshift(status);
  await set("status_history", history.slice(0, 10));
}

export async function getStatus() {
  return await get("last_status");
}

export async function getStatusHistory() {
  return (await get("status_history")) || [];
}

// Verification de propriete de compte Roblox par code temporaire
// (a coller dans la description/bio du profil Roblox).
export async function setVerification(userId, payload, ttlSeconds = 600) {
  await redisCommand(["SET", `verify:${userId}`, JSON.stringify(payload), "EX", String(ttlSeconds)]);
}

export async function getVerification(userId) {
  return await get(`verify:${userId}`);
}

export async function clearVerification(userId) {
  await del(`verify:${userId}`);
}
