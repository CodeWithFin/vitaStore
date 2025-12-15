-- Supabase schema for VitaStore
-- Run this in the Supabase SQL editor.

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Items table
create table if not exists public.items (
  id bigserial primary key,
  name text not null,
  sku text unique not null,
  unit text default 'pcs',
  quantity integer not null default 0,
  min_stock integer not null default 0,
  price numeric(10,2) default 0,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions table
create table if not exists public.transactions (
  id bigserial primary key,
  item_id bigint references public.items(id) on delete cascade,
  type text check (type in ('IN','OUT')) not null,
  quantity integer not null,
  notes text,
  shop text,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_transactions_item_id on public.transactions(item_id);
create index if not exists idx_items_sku on public.items(sku);

-- Enable Row Level Security
alter table public.items enable row level security;
alter table public.transactions enable row level security;

-- Policies: allow authenticated users full access
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'items' and policyname = 'Allow authenticated users full access to items'
  ) then
    create policy "Allow authenticated users full access to items"
      on public.items for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'Allow authenticated users full access to transactions'
  ) then
    create policy "Allow authenticated users full access to transactions"
      on public.transactions for all
      to authenticated
      using (true)
      with check (true);
  end if;
end$$;

-- Create admin user
-- Note: This requires the pgcrypto extension and proper Supabase auth setup
-- Alternative: Create user via Supabase Dashboard > Authentication > Users > Add user

-- Enable pgcrypto extension for password hashing
create extension if not exists "pgcrypto";

-- Function to create admin user (run this in Supabase SQL editor)
-- WARNING: This directly inserts into auth.users. Use Supabase Dashboard method if this doesn't work.
do $$
declare
  user_id uuid;
  encrypted_password text;
begin
  -- Generate UUID for user
  user_id := gen_random_uuid();
  
  -- Hash password using bcrypt (Supabase uses bcrypt)
  encrypted_password := crypt('Admin@123', gen_salt('bf'));
  
  -- Insert user into auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) values (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    'admin215@gmail.com',
    encrypted_password,
    now(),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false
  )
  on conflict (email) do nothing;
  
  -- Insert into auth.identities
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    user_id,
    format('{"sub": "%s", "email": "%s"}', user_id::text, 'admin215@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  )
  on conflict do nothing;
end$$;

-- Optionally seed an example item
-- insert into public.items (name, sku, unit, quantity, min_stock, price, category)
-- values ('Sample Item', 'SKU-001', 'pcs', 10, 2, 9.99, 'General')
-- on conflict do nothing;

