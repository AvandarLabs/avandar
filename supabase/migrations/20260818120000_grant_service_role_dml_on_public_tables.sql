-- Backfill `service_role` DML on every public table that already exists.
--
-- Table files under `supabase/schemas/` now declare
-- `grant select, insert, update, delete ... to authenticated, service_role`
-- next to `create table`. `schema_paths` is empty, so those files never run
-- on a migrations-built database (CI, `db reset`). Older create-table
-- migrations granted `authenticated` only. Postgres default privileges give
-- `service_role` TRUNCATE/REFERENCES/TRIGGER, not DML, so a fresh database
-- rejected service-role inserts (`permission denied for table maps`).
--
-- Do not edit those already-applied create-table migrations. This statement
-- is evaluated against tables that exist when it runs. New tables still need
-- the grant in their own create migration; `db diff` often omits it, so add
-- it by hand if the generated file is missing `to "service_role"`.
--
-- Written by hand. Privileges are a documented `db diff` blind spot.
grant
select
,
  insert,
update,
delete on all tables in schema public to service_role;
