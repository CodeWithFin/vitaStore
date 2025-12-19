-- Make SKU column optional (nullable) in items table
-- Run this in the Supabase SQL editor.

alter table if exists public.items
  alter column sku drop not null;

