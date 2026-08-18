begin;

select plan(9);

select is(
  (
    select jsonb_object_agg(
      event_name,
      public.util__analytics_event_category(event_name)::text
    )
    from (
      values
        ('dataset.imported'),
        ('query.ran'),
        ('query.failed'),
        ('dashboard.published'),
        ('dashboard.share_settings_updated'),
        ('dashboard.block_added_via_chat'),
        ('dashboard.filter_changed'),
        ('dashboard.pdf_export_opened'),
        ('dashboard.pdf_exported'),
        ('chat.message_sent'),
        ('chat.sql_generated'),
        ('chat.turn_completed'),
        ('chat.turn_failed'),
        ('dashboard.public_viewed'),
        ('user.registered'),
        ('user.email_confirmed'),
        ('user.signed_in'),
        ('workspace.created'),
        ('workspace.invite_sent'),
        ('workspace.invite_accepted'),
        ('member.removed'),
        ('dataset.deleted'),
        ('dashboard.deleted'),
        ('subscription.created'),
        ('subscription.plan_changed'),
        ('subscription.status_changed')
    ) as registered_events(event_name)
  ),
  jsonb_build_object(
    'dataset.imported', 'activation',
    'query.ran', 'activation',
    'query.failed', 'engagement',
    'dashboard.published', 'activation',
    'dashboard.share_settings_updated', 'engagement',
    'dashboard.block_added_via_chat', 'engagement',
    'dashboard.filter_changed', 'engagement',
    'dashboard.pdf_export_opened', 'engagement',
    'dashboard.pdf_exported', 'engagement',
    'chat.message_sent', 'engagement',
    'chat.sql_generated', 'engagement',
    'chat.turn_completed', 'engagement',
    'chat.turn_failed', 'engagement',
    'dashboard.public_viewed', 'expansion',
    'user.registered', 'acquisition',
    'user.email_confirmed', 'acquisition',
    'user.signed_in', 'engagement',
    'workspace.created', 'activation',
    'workspace.invite_sent', 'expansion',
    'workspace.invite_accepted', 'expansion',
    'member.removed', 'expansion',
    'dataset.deleted', 'expansion',
    'dashboard.deleted', 'expansion',
    'subscription.created', 'revenue',
    'subscription.plan_changed', 'revenue',
    'subscription.status_changed', 'revenue'
  ),
  'every registered event name maps to its reporting category'
);

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
