-- Ejecutar en el SQL Editor de Supabase.
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  problem jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.problems enable row level security;

-- Demo del curso: cualquiera con la anon key puede leer e insertar.
-- (En el Sprint 2 se puede restringir por usuario con Supabase Auth.)
create policy "leer problemas" on public.problems for select using (true);
create policy "guardar problemas" on public.problems for insert with check (true);
