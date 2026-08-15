create type public.dashboard_snapshot_transition_kind as enum(
  'publish',
  'abort_publish',
  'unpublish',
  'delete'
);
