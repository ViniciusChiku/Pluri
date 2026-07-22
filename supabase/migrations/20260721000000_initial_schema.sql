-- Baseline schema snapshot, reverse-engineered from the live "pluri" Supabase
-- project (ejftqgqbjyxnucmqcvgn) on 2026-07-21. This was the first time the
-- schema was captured in the repo — it previously existed only in the
-- Supabase dashboard with no local source of truth.

create table if not exists public.daily_news (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  language text not null,
  category text,
  title text not null,
  summary text,
  text text not null,
  translation text not null,
  estimated_level text,
  difficulty_score integer,
  source_url text,
  image_url text
);

alter table public.daily_news enable row level security;

create policy "Permitir leitura pública para todas as notícias"
  on public.daily_news for select
  using (true);

create policy "Permitir inserção de notícias"
  on public.daily_news for insert
  with check (true);


create table if not exists public.language_profiles (
  id text primary key,
  profile_id uuid not null,
  name text not null,
  target_weekly_minutes integer default 0,
  primary_goal text,
  current_level text default 'A2',
  updated_at timestamptz default now()
);

create index if not exists idx_language_profiles_profile_id on public.language_profiles (profile_id);
alter table public.language_profiles enable row level security;

create policy "Users manage own language_profiles"
  on public.language_profiles for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);


create table if not exists public.study_sessions (
  id text primary key,
  profile_id uuid not null,
  language text not null,
  competence text,
  duration_minutes integer default 0,
  completed boolean default false,
  date_studied date not null default current_date,
  notes text
);

create index if not exists idx_study_sessions_profile_id on public.study_sessions (profile_id);
alter table public.study_sessions enable row level security;

create policy "Users manage own study_sessions"
  on public.study_sessions for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);


create table if not exists public.flashcards (
  id text primary key,
  profile_id uuid not null,
  front text not null,
  back text not null,
  language text,
  example text,
  next_review date not null default current_date,
  ease_factor numeric not null default 2.5,
  repetitions integer not null default 0,
  interval_days integer not null default 1
);

create index if not exists idx_flashcards_profile_id on public.flashcards (profile_id);
alter table public.flashcards enable row level security;

create policy "Users manage own flashcards"
  on public.flashcards for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);


create table if not exists public.notes (
  id text primary key,
  profile_id uuid not null,
  title text,
  content text,
  language text,
  updated_at timestamptz default now()
);

create index if not exists idx_notes_profile_id on public.notes (profile_id);
alter table public.notes enable row level security;

create policy "Users manage own notes"
  on public.notes for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
