begin;

select plan(7);

select has_function(
  'public',
  'util__log_analytics_event',
  array['text', 'uuid', 'uuid', 'app_type', 'jsonb'],
  'util__log_analytics_event exists with the expected signature'
);

select is_definer(
  'public',
  'util__log_analytics_event',
  array['text', 'uuid', 'uuid', 'app_type', 'jsonb'],
  'util__log_analytics_event is SECURITY DEFINER so triggers can insert past RLS'
);

-- A successful call records the row and stamps it as database-emitted.
select public.util__log_analytics_event(
  'workspace.created',
  null,
  null,
  null,
  '{"isFirstWorkspaceForUser": true}'::jsonb
);

select is(
  (
    select client::text
    from public.usage_analytics_events
    where event_name = 'workspace.created'
    limit 1
  ),
  'db',
  'the helper stamps client as db so callers cannot get it wrong'
);

select is(
  (
    select app_version
    from public.usage_analytics_events
    where event_name = 'workspace.created'
    limit 1
  ),
  null,
  'the helper leaves app_version null because the database has no build version'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'workspace.created'
    limit 1
  ),
  'activation',
  'the category trigger still applies to helper-inserted rows'
);

-- A failing insert must not raise. A workspace_id that violates the foreign
-- key is the cheapest way to force one.
select lives_ok(
  $$ select public.util__log_analytics_event(
       'workspace.created',
       '00000000-0000-0000-0000-000000000000'::uuid
     ) $$,
  'a failed insert is swallowed rather than raised, so it cannot roll back the caller'
);

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where workspace_id = '00000000-0000-0000-0000-000000000000'::uuid
  ),
  0::bigint,
  'the failed insert recorded nothing'
);

select * from finish();

rollback;
