begin;

select plan(8);

-- One representative event per category, so a mis-typed enum label in the
-- mapping function fails here rather than silently landing in `other`.
select is(
  public.util__analytics_event_category('user.registered')::text,
  'acquisition',
  'user.registered is acquisition'
);
select is(
  public.util__analytics_event_category('query.ran')::text,
  'activation',
  'query.ran is activation'
);
select is(
  public.util__analytics_event_category('chat.message_sent')::text,
  'engagement',
  'chat.message_sent is engagement'
);
select is(
  public.util__analytics_event_category('workspace.invite_sent')::text,
  'expansion',
  'workspace.invite_sent is expansion'
);
select is(
  public.util__analytics_event_category('subscription.plan_changed')::text,
  'revenue',
  'subscription.plan_changed is revenue'
);
select is(
  public.util__analytics_event_category('not.a.real.event')::text,
  'other',
  'an unmapped name falls back to other instead of raising'
);

-- The trigger fills the column when the caller omits it.
insert into public.usage_analytics_events (event_name)
values ('query.ran');

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'query.ran'
    order by created_at desc
    limit 1
  ),
  'activation',
  'the trigger sets event_category when the caller omits it'
);

-- The trigger overrides a caller-supplied value. This is the guarantee the
-- whole column rests on, so it is asserted directly.
insert into public.usage_analytics_events (event_name, event_category)
values ('subscription.plan_changed', 'engagement');

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'subscription.plan_changed'
    order by created_at desc
    limit 1
  ),
  'revenue',
  'the trigger overrides a category supplied by the caller'
);

select * from finish();

rollback;
