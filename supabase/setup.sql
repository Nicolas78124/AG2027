-- AG 2027 · Île Maurice — création des tables et des droits
-- À coller dans Supabase : SQL Editor → New query → Run

create table if not exists public.expenses (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.medias (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
alter table public.medias enable row level security;

-- Accès réservé à ceux qui ont le code d'accès du site (envoyé par le site dans l'en-tête x-ag-code)
create or replace function public.ag_code_ok() returns boolean
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-ag-code', '') = 'Anahita2027'
$$;

drop policy if exists "ag lire depenses" on public.expenses;
drop policy if exists "ag ajouter depenses" on public.expenses;
drop policy if exists "ag modifier depenses" on public.expenses;
create policy "ag lire depenses" on public.expenses for select to anon, authenticated using (public.ag_code_ok());
create policy "ag ajouter depenses" on public.expenses for insert to anon, authenticated with check (public.ag_code_ok());
create policy "ag modifier depenses" on public.expenses for update to anon, authenticated using (public.ag_code_ok()) with check (public.ag_code_ok());

drop policy if exists "ag lire medias" on public.medias;
drop policy if exists "ag ajouter medias" on public.medias;
drop policy if exists "ag modifier medias" on public.medias;
create policy "ag lire medias" on public.medias for select to anon, authenticated using (public.ag_code_ok());
create policy "ag ajouter medias" on public.medias for insert to anon, authenticated with check (public.ag_code_ok());
create policy "ag modifier medias" on public.medias for update to anon, authenticated using (public.ag_code_ok()) with check (public.ag_code_ok());

grant select, insert, update on public.expenses, public.medias to anon, authenticated;

-- Espace de stockage des photos et vidéos (50 Mo max par fichier)
insert into storage.buckets (id, name, public, file_size_limit)
values ('medias', 'medias', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "ag envoyer medias" on storage.objects;
create policy "ag envoyer medias" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'medias');
