-- Run ONLY after verifying create_item_batches.sql migrated data correctly.
-- Verify with:
--   select i.id, i.name, i.quantity as old_qty, coalesce(sum(b.quantity), 0) as batch_qty
--   from public.items i
--   left join public.item_batches b on b.item_id = i.id
--   group by i.id, i.name, i.quantity
--   having i.quantity <> coalesce(sum(b.quantity), 0);

alter table if exists public.items drop column if exists quantity;
alter table if exists public.items drop column if exists expiry_date;
