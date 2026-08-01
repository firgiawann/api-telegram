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
