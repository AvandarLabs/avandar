-- Full DML for `service_role`, granted once for the whole schema.
--
-- Per-table grants for `anon` and `authenticated` live beside each
-- `create table`, under its `enable row level security` line. They are written
-- down because Supabase CLI 2.114.0 stopped auto-exposing new tables in
-- `public`, so an undeclared table is unreachable through PostgREST no matter
-- how correct its RLS is. To audit one role across the schema, grep for it:
-- `rg 'to anon;' supabase/schemas/`.
--
-- `service_role` stays a blanket grant rather than 27 per-table lines. It is
-- the trusted backend key, it never reaches a browser, and it already bypasses
-- RLS, so narrowing it adds breakage risk without closing a hole. Granting it
-- here also means a new table is covered without another edit.
--
-- THIS FILE MUST RUN AFTER EVERY `create table`, which is why it is numbered
-- 99. `on all tables in schema` is evaluated when it runs and does not apply
-- to tables created later, so a table defined after this file would silently
-- get no backend access. `supabase db diff` will not catch that: the local
-- bootstrap's `alter default privileges` still grants DML to `service_role`,
-- which masks the omission until that default is removed. `99.storage.sql`
-- sorts after this file and is fine, because it creates no table in `public`.
--
-- TRUNCATE, REFERENCES and TRIGGER are deliberately never granted anywhere.
-- The narrowed default still hands all three to every role, revoking them
-- would fight that default forever, and none is reachable through PostgREST.
grant
select
,
  insert,
update,
delete on all tables in schema public to service_role;
