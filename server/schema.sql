-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Profiles table
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Weekly Plans table
create table if not exists weekly_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  day_name text not null,
  muscle_group text not null,
  is_rest_day integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, day_of_week)
);

-- Workout Logs table
create table if not exists workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  date text not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  muscle_group text not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Exercises table
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  weight real not null,
  sets integer not null,
  reps integer not null,
  created_at timestamptz default now()
);

-- Exercise Sets table
create table if not exists exercise_sets (
  id uuid primary key default uuid_generate_v4(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  set_number integer not null,
  weight real not null,
  reps integer not null,
  created_at timestamptz default now()
);
