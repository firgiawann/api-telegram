// ============================================================
// Helper KV — persistent storage (Vercel KV / Upstash)
// Fallback ke in-memory Map kalau KV belum di-set (untuk dev).
// ============================================================
import { createClient } from "@vercel/kv";

let kv = null;
const memory = new Map();

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export async function kvGet(key) {
  if (kv) return kv.get(key);
  return memory.get(key) ?? null;
}

export async function kvSet(key, value) {
  if (kv) return kv.set(key, value);
  memory.set(key, value);
  return "OK";
}

export async function kvPush(key, value, maxLen) {
  // Simpan array JSON dengan batas panjang (history log)
  const arr = (await kvGet(key)) || [];
  arr.unshift(value);
  const trimmed = arr.slice(0, maxLen || 200);
  await kvSet(key, trimmed);
  return trimmed;
}

export function isKvConfigured() {
  return kv !== null;
}
