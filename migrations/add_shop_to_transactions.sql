-- Migration: Add shop column to transactions table
-- Run this in the Supabase SQL editor if you have an existing database

-- Add shop column to transactions if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'transactions' 
    and column_name = 'shop'
  ) then
    alter table public.transactions add column shop text;
    raise notice 'Shop column added to transactions table';
  else
    raise notice 'Shop column already exists in transactions table';
  end if;
end$$;

