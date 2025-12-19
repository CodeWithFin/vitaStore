-- Add transaction_date column to transactions table
-- Run this in the Supabase SQL editor.

alter table if exists public.transactions
  add column if not exists transaction_date date;

