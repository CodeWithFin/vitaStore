-- Supabase schema for VitaStore
-- Run this in the Supabase SQL editor.

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Items table (stock lives in item_batches)
create table if not exists public.items (
  id bigserial primary key,
  name text not null,
  sku text unique,
  unit text default 'pcs',
  min_stock integer not null default 0,
  price numeric(10,2) default 0,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Batch tracking: quantity and expiry per receipt
create table if not exists public.item_batches (
  id bigserial primary key,
  item_id bigint not null references public.items(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  expiry_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_item_batches_item_id on public.item_batches(item_id);
create index if not exists idx_item_batches_expiry_date on public.item_batches(expiry_date);
create index if not exists idx_item_batches_fefo on public.item_batches(item_id, expiry_date asc nulls last, created_at asc);

-- Transactions table
create table if not exists public.transactions (
  id bigserial primary key,
  item_id bigint references public.items(id) on delete cascade,
  type text check (type in ('IN','OUT')) not null,
  quantity integer not null,
  notes text,
  shop text,
  transaction_date date,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_transactions_item_id on public.transactions(item_id);
create index if not exists idx_items_sku on public.items(sku);

-- Aggregated item stock view (JOIN + SUM over batches)
create or replace view public.items_with_stock as
select
  i.id,
  i.name,
  i.sku,
  i.unit,
  i.min_stock,
  i.price,
  i.category,
  i.created_at,
  i.updated_at,
  coalesce(sum(b.quantity), 0)::integer as quantity,
  coalesce(
    json_agg(
      json_build_object(
        'id', b.id,
        'quantity', b.quantity,
        'expiry_date', b.expiry_date,
        'created_at', b.created_at
      )
      order by b.expiry_date asc nulls last, b.created_at asc, b.id asc
    ) filter (where b.id is not null),
    '[]'::json
  ) as batches,
  min(b.expiry_date) filter (where b.quantity > 0 and b.expiry_date is not null) as expiry_date
from public.items i
left join public.item_batches b on b.item_id = i.id
group by i.id;

-- Batch stock functions
create or replace function public.add_stock_batch(
  p_item_id bigint,
  p_quantity integer,
  p_expiry_date date default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id bigint;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'Item not found';
  end if;

  select id
  into v_batch_id
  from public.item_batches
  where item_id = p_item_id
    and expiry_date is not distinct from p_expiry_date
  for update;

  if found then
    update public.item_batches
    set quantity = quantity + p_quantity
    where id = v_batch_id;
  else
    insert into public.item_batches (item_id, quantity, expiry_date)
    values (p_item_id, p_quantity, p_expiry_date)
    returning id into v_batch_id;
  end if;

  update public.items set updated_at = now() where id = p_item_id;
  return v_batch_id;
end;
$$;

create or replace function public.deduct_stock_fefo(
  p_item_id bigint,
  p_quantity integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_quantity;
  v_batch record;
  v_available integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select coalesce(sum(quantity), 0)
  into v_available
  from public.item_batches
  where item_id = p_item_id;

  if v_available < p_quantity then
    raise exception 'Insufficient stock. Available: %', v_available;
  end if;

  for v_batch in
    select id, quantity
    from public.item_batches
    where item_id = p_item_id
      and quantity > 0
    order by expiry_date asc nulls last, created_at asc, id asc
    for update
  loop
    exit when v_remaining <= 0;

    if v_batch.quantity <= v_remaining then
      v_remaining := v_remaining - v_batch.quantity;
      delete from public.item_batches where id = v_batch.id;
    else
      update public.item_batches
      set quantity = quantity - v_remaining
      where id = v_batch.id;
      v_remaining := 0;
    end if;
  end loop;

  update public.items set updated_at = now() where id = p_item_id;
end;
$$;

grant select on public.items_with_stock to authenticated;
grant execute on function public.add_stock_batch(bigint, integer, date) to authenticated;
grant execute on function public.deduct_stock_fefo(bigint, integer) to authenticated;

-- Enable Row Level Security
alter table public.items enable row level security;
alter table public.item_batches enable row level security;
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

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'item_batches' and policyname = 'Allow authenticated users full access to item_batches'
  ) then
    create policy "Allow authenticated users full access to item_batches"
      on public.item_batches for all
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

