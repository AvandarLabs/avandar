-- Values are listed in the order Postgres actually stores them, which is the
-- order they were added, not a logical grouping. `gis` was appended later by
-- `alter type ... add value` (see the add_gis_app_type_enum_value migration),
-- so it sorts last. Keep new values at the end: moving one is not a rename,
-- it forces a full rebuild of the type and a rewrite of every column using it.
create type public.app_type as enum(
  'data_sources',
  'data_explorer',
  'dashboards',
  'settings',
  'gis'
);
