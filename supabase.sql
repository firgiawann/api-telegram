-- ============================================================
-- Supabase SQL — jalankan SEKALI di SQL Editor project kamu
-- https://supabase.com/dashboard/project/<ref>/sql/new
--
-- KEAMANAN (RLS aktif penuh):
--   • Semua tabel terkunci: anon/authenticated TIDAK bisa
--     membaca/menulis apa pun (ditolak RLS + privilege revoked).
--   • API server (Vercel) pakai service_role key → bypass RLS,
--     jadi semua operasi API tetap jalan normal.
--   • Tabel `claims` (PII: nama, email, IP) terkunci total.
--   • Fungsi decrement_stock hanya executable oleh service_role.
-- ============================================================

-- ========== 1) TABEL ==========

-- Key-value untuk setting bot (link canva, stok, dll)
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- Riwayat update link Canva
create table if not exists public.canva_history (
  id         bigint generated always as identity primary key,
  link       text not null,
  changed_by text default 'api',
  created_at timestamptz default now()
);

-- Data user yang klaim Canva (PII — paling sensitif, wajib terkunci)
create table if not exists public.claims (
  id             bigint generated always as identity primary key,
  name           text,
  email          text,
  ip             text,
  location       text,
  org            text,
  device         text,
  platform       text,
  user_agent     text,
  stock_at_claim integer,
  created_at     timestamptz default now()
);

-- ========== 2) SEED DATA (opsional) ==========

insert into public.settings (key, value)
values ('canva_link', 'https://www.canva.com/brand/join?token=GANTI_DENGAN_LINK_KAMU')
on conflict (key) do nothing;

insert into public.settings (key, value)
values ('canva_stock', '100')
on conflict (key) do nothing;

-- ========== 3) FUNGSI decrement_stock ==========
-- security definer → jalan sebagai pemilik (postgres), bypass RLS
-- set search_path = public → cegah search-path hijack
create or replace function public.decrement_stock()
returns integer
language sql
security definer
set search_path = public
as $$
  update public.settings
  set value = greatest(coalesce(cast(value as integer), 0) - 1, 0),
      updated_at = now()
  where key = 'canva_stock'
  returning cast(value as integer);
$$;

-- ========== 4) RLS: AKTIF di semua tabel ==========

alter table public.settings enable row level security;
alter table public.canva_history enable row level security;
alter table public.claims enable row level security;

-- Tanpa policy = semua akses dari anon/authenticated DITOLAK.
-- (service_role bypass RLS, jadi API tetap jalan.)
--
-- ⚠️ JANGAN tambahkan policy baca publik untuk `claims` —
--    isinya PII (nama, email, IP) dan hanya boleh dibaca server.
--
-- Opsional: kalau nanti mau frontend baca `settings` langsung
-- via anon key (tanpa API), aktifkan policy ini:
-- create policy "settings anon read" on public.settings
--   for select to anon, authenticated using (true);

-- ========== 5) PRIVILEGE: batasi grant (defense in depth) ==========
-- Hanya service_role yang boleh menyentuh tabel.
revoke all on table public.settings from anon, authenticated;
revoke all on table public.canva_history from anon, authenticated;
revoke all on table public.claims from anon, authenticated;

grant all on table public.settings to service_role;
grant all on table public.canva_history to service_role;
grant all on table public.claims to service_role;

-- Fungsi decrement_stock hanya bisa dipanggil service_role
-- (cegah anon menguras stok via rpc)
revoke execute on function public.decrement_stock() from public, anon, authenticated;
grant execute on function public.decrement_stock() to service_role;

-- ========== 6) INDEX ==========

create index if not exists idx_canva_history_created
  on public.canva_history (created_at desc);

create index if not exists idx_claims_created
  on public.claims (created_at desc);
