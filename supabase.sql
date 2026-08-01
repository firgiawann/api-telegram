-- ============================================================
-- Supabase SQL — jalankan sekali di SQL Editor project kamu
-- (https://supabase.com/dashboard/project/<ref>/sql/new)
-- ============================================================

-- Tabel key-value untuk setting bot (link canva, stok, dll)
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

-- Data user yang klaim Canva (untuk analisa)
create table if not exists public.claims (
  id           bigint generated always as identity primary key,
  name         text,
  email        text,
  ip           text,
  location     text,
  org          text,
  device       text,
  platform     text,
  user_agent   text,
  stock_at_claim integer,
  created_at   timestamptz default now()
);

-- Isi default (opsional): link Canva awal kamu
insert into public.settings (key, value)
values ('canva_link', 'https://www.canva.com/brand/join?token=GANTI_DENGAN_LINK_KAMU')
on conflict (key) do nothing;

insert into public.settings (key, value)
values ('canva_stock', '100')
on conflict (key) do nothing;

-- Fungsi decrement stok ATOMIK (anti race condition & anti-cheat)
-- Dipanggil dari API saat user klaim. Mengembalikan stok terbaru.
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

-- RLS: matikan untuk kemudahan (API pakai service_role key yang
-- bypass RLS). Kalau mau ketat, buat policy khusus anon/authenticated.
alter table public.settings disable row level security;
alter table public.canva_history disable row level security;
alter table public.claims disable row level security;

-- Index untuk riwayat & analisa (query terbaru duluan)
create index if not exists idx_canva_history_created
  on public.canva_history (created_at desc);

create index if not exists idx_claims_created
  on public.claims (created_at desc);
