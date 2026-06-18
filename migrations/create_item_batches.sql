-- Batch tracking migration for VitaStore
-- Maps to "product_batches" concept: item_batches.item_id references items (products).
-- Run this in the Supabase SQL editor BEFORE dropping columns from items.

-- 1. Create item_batches table
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

-- 2. Migrate existing stock/expiry data from items into item_batches
insert into public.item_batches (item_id, quantity, expiry_date, created_at)
select
  id,
  quantity,
  expiry_date,
  coalesce(updated_at, created_at, now())
from public.items
where quantity > 0;

-- Also create zero-quantity placeholder rows for items with expiry but no stock (optional metadata)
insert into public.item_batches (item_id, quantity, expiry_date, created_at)
select
  id,
  0,
  expiry_date,
  coalesce(updated_at, created_at, now())
from public.items
where quantity = 0
  and expiry_date is not null
  and not exists (
    select 1 from public.item_batches b where b.item_id = items.id
  );

-- 3. Add stock to a batch (merges same expiry_date, including NULL)
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

-- 4. Deduct stock using FEFO (First Expiring, First Out) inside a transaction
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

-- 5. View: aggregate quantity via JOIN + SUM, expose batches as JSON array
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

-- 6. RLS for item_batches
alter table public.item_batches enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'item_batches'
      and policyname = 'Allow authenticated users full access to item_batches'
  ) then
    create policy "Allow authenticated users full access to item_batches"
      on public.item_batches for all
      to authenticated
      using (true)
      with check (true);
  end if;
end$$;

-- Grant access to view and RPC functions
grant select on public.items_with_stock to authenticated;
grant execute on function public.add_stock_batch(bigint, integer, date) to authenticated;
grant execute on function public.deduct_stock_fefo(bigint, integer) to authenticated;
