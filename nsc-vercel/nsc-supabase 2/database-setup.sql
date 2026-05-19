-- ============================================================
-- NSC Performance Portal — Supabase Database Schema
-- ============================================================
-- HOW TO USE:
-- 1. Go to supabase.com → your project → SQL Editor
-- 2. Paste this entire file in
-- 3. Click Run
-- All tables will be created automatically
-- ============================================================

-- PARENT ACCOUNTS
create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  created_at timestamptz default now()
);

-- CHILDREN (linked to parent accounts)
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references parents(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  age_group text,
  school text,
  experience text,
  medical_notes text,
  medication text,
  created_at timestamptz default now()
);

-- SESSIONS (created by staff)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  date date not null,
  time text not null,
  location text not null,
  age_group text not null,
  capacity integer not null default 20,
  price numeric(10,2) not null default 0,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- BOOKINGS (parent books child into session)
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references parents(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  child_name text not null,
  parent_name text not null,
  parent_email text not null,
  amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  payment_method text,
  payment_ref text,
  payment_intent_id text,
  consents jsonb,
  created_at timestamptz default now()
);

-- PAYMENTS LOG
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  parent_id uuid references parents(id),
  session_id uuid references sessions(id),
  child_name text,
  parent_name text,
  parent_email text,
  session_name text,
  amount numeric(10,2) not null,
  status text not null default 'pending',
  method text,
  stripe_ref text,
  created_at timestamptz default now()
);

-- ATTENDANCE
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  player_name text not null,
  parent_email text,
  status text not null default 'present',
  marked_at timestamptz default now()
);

-- STAFF ACCOUNTS
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  full_name text not null,
  role text not null,
  created_at timestamptz default now()
);

-- INSERT DEFAULT STAFF ACCOUNT
-- Password is: nsc2026
-- (stored as plain text here for simplicity - update to bcrypt in production)
insert into staff (username, password_hash, full_name, role)
values ('nathaniel', 'nsc2026', 'Nathaniel Steed', 'Founder & Director')
on conflict (username) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS but allow service role full access
-- ============================================================
alter table parents enable row level security;
alter table children enable row level security;
alter table sessions enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table attendance enable row level security;
alter table staff enable row level security;

-- Allow service role (used by Netlify functions) full access to everything
create policy "Service role full access" on parents for all using (true);
create policy "Service role full access" on children for all using (true);
create policy "Service role full access" on sessions for all using (true);
create policy "Service role full access" on bookings for all using (true);
create policy "Service role full access" on payments for all using (true);
create policy "Service role full access" on attendance for all using (true);
create policy "Service role full access" on staff for all using (true);
