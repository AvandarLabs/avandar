-- Kept in its own migration because `alter type ... add value` cannot share a
-- transaction with statements that use the new value, and the maps migration
-- that follows references 'map' throughout.
--
-- `add value` is also deliberate over the type rename-and-swap that
-- `supabase db diff` generates for an added enum member: swapping requires
-- `alter table ... alter column resource_type type ...`, which Postgres
-- refuses while an RLS policy on resource_shares depends on that column.
alter type public.resource_type
add value 'map'
after 'dataset';
