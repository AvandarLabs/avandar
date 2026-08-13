begin;

select plan(7);

select has_column(
  'public', 'usage_analytics_events', 'event_category',
  'usage_analytics_events has an event_category column'
);
select has_column(
  'public', 'usage_analytics_events', 'client',
  'usage_analytics_events has a client column'
);
select has_column(
  'public', 'usage_analytics_events', 'app_version',
  'usage_analytics_events has an app_version column'
);

select col_not_null(
  'public', 'usage_analytics_events', 'event_category',
  'event_category is NOT NULL'
);
select col_not_null(
  'public', 'usage_analytics_events', 'client',
  'client is NOT NULL'
);
select col_is_null(
  'public', 'usage_analytics_events', 'app_version',
  'app_version is nullable because db and server rows have no build version'
);

select has_index(
  'public',
  'usage_analytics_events',
  'usage_analytics_events__event_category__created_at_idx',
  'the category reporting index exists'
);

select * from finish();

rollback;
