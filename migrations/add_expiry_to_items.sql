-- Add expiry_date column to items if it doesn't exist
alter table if exists public.items
  add column if not exists expiry_date date;

