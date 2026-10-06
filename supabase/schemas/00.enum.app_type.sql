/**
 * One app in the product. Scopes a role group's role to a section of the UI.
 *
 * Note: Values sort in the order they were added, not a logical grouping, so
 * `gis` sorts last. Keep new values at the end. Moving one is not a rename,
 * it forces a full rebuild of the type and a rewrite of every column using
 * it.
 */
create type public.app_type as enum(
  'data_sources',
  'data_explorer',
  'dashboards',
  'settings',
  'gis'
);
