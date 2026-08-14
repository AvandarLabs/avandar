-- New enum label must be committed before it can be used (PG 55P04), so this
-- migration adds the label and nothing that references it.
alter type public.app_type
add value if not exists 'gis';
