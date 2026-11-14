-- Covers `rpc_workspaces__is_slug_available`: the answers it gives, that it
-- sees slugs of workspaces the caller cannot read, and who may execute it.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'slug_owner@test.dev',
  'authenticated',
  'authenticated',
  now()
);

insert into auth.users (id, email, aud, role, created_at)
values (
  'b3000002-0000-4000-8000-000000000002'::uuid,
  'slug_outsider@test.dev',
  'authenticated',
  'authenticated',
  now()
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'Slug check workspace',
  'slug-check-taken'
);

select plan(11);

-- Run as a signed-in user who does not belong to the workspace above, so RLS
-- hides its row from a plain select.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "b3000002-0000-4000-8000-000000000002", "role": "authenticated"}',
  true
);

select is(
  (select count(*) from public.workspaces where slug = 'slug-check-taken'),
  0::bigint,
  'RLS hides the taken workspace from the caller'
);

select is(
  public.rpc_workspaces__is_slug_available ('slug-check-taken'),
  false,
  'a slug in use by a workspace the caller cannot read is not available'
);

select is(
  public.rpc_workspaces__is_slug_available ('slug-check-free'),
  true,
  'an unused, well-formed slug is available'
);

select is(
  public.rpc_workspaces__is_slug_available ('ab'),
  false,
  'a slug shorter than 3 characters is not available'
);

select is(
  public.rpc_workspaces__is_slug_available (repeat('a', 20)),
  true,
  'a 20 character slug is available'
);

select is(
  public.rpc_workspaces__is_slug_available (repeat('a', 21)),
  false,
  'a slug longer than 20 characters is not available'
);

select is(
  public.rpc_workspaces__is_slug_available ('has space'),
  false,
  'a slug with a space is not available'
);

select is(
  public.rpc_workspaces__is_slug_available ('under_score'),
  false,
  'a slug with characters other than letters, numbers, and hyphens is not available'
);

select is(
  public.rpc_workspaces__is_slug_available (null),
  false,
  'a null slug is not available'
);

reset role;

select function_privs_are(
  'public',
  'rpc_workspaces__is_slug_available',
  array['text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated can execute the slug check'
);

select function_privs_are(
  'public',
  'rpc_workspaces__is_slug_available',
  array['text'],
  'anon',
  array[]::text[],
  'anon cannot execute the slug check'
);

select * from finish();

rollback;
