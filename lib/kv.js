import { kv } from "@vercel/kv";

// Une seule "queue" simple : une commande en attente a la fois.
// Suffisant pour un usage perso (un plugin qui vient la chercher).

export async function setPendingCommand(command) {
  await kv.set("pending_command", command);
}

export async function getPendingCommand() {
  return await kv.get("pending_command");
}

export async function clearPendingCommand() {
  await kv.del("pending_command");
}

export async function setStatus(status) {
  await kv.set("last_status", status);
  // On garde aussi un petit historique (10 derniers logs)
  const history = (await kv.get("status_history")) || [];
  history.unshift(status);
  await kv.set("status_history", history.slice(0, 10));
}

export async function getStatus() {
  return await kv.get("last_status");
}

export async function getStatusHistory() {
  return (await kv.get("status_history")) || [];
}
