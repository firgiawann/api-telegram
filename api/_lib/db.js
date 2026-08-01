// ============================================================
// Helper Database — Supabase (Postgres)
// Ganti Vercel KV. Setup cukup: buat 2 tabel (lihat supabase.sql)
// dan set env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// ============================================================
import { createClient } from "@supabase/supabase-js";

let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function ensureDb() {
  if (!supabase) throw new Error("Supabase belum di-set (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY)");
  return supabase;
}

// Ambil setting (key-value) dari tabel `settings`
export async function dbGet(key) {
  const { data, error } = await ensureDb()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`dbGet(${key}) gagal: ${error.message}`);
  return data?.value ?? null;
}

// Simpan setting (upsert)
export async function dbSet(key, value) {
  const { error } = await ensureDb()
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`dbSet(${key}) gagal: ${error.message}`);
  return "OK";
}

// Catat riwayat update link
export async function dbHistory(link, changedBy = "api") {
  const { error } = await ensureDb()
    .from("canva_history")
    .insert({ link, changed_by: changedBy });
  if (error) throw new Error(`dbHistory gagal: ${error.message}`);
}

// Ambil N riwayat terbaru
export async function dbHistoryList(limit = 5) {
  const { data, error } = await ensureDb()
    .from("canva_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`dbHistoryList gagal: ${error.message}`);
  return data || [];
}

// Panggil fungsi SQL (mis. decrement_stock)
export async function dbRpc(fnName) {
  const { data, error } = await ensureDb().rpc(fnName);
  if (error) throw new Error(`dbRpc(${fnName}) gagal: ${error.message}`);
  return data;
}

// Insert data klaim
export async function dbInsertClaim(claim) {
  const { error } = await ensureDb().from("claims").insert(claim);
  if (error) throw new Error(`dbInsertClaim gagal: ${error.message}`);
}

// Ambil data klaim terbaru
export async function dbClaims(limit = 10) {
  const { data, error } = await ensureDb()
    .from("claims")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`dbClaims gagal: ${error.message}`);
  return data || [];
}

// Total jumlah klaim
export async function dbClaimCount() {
  const { count, error } = await ensureDb()
    .from("claims")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`dbClaimCount gagal: ${error.message}`);
  return count || 0;
}
