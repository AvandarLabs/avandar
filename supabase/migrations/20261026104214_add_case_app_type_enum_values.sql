-- New enum labels must be committed before they can be used (PG 55P04), so
-- this migration adds the labels and nothing that references them.
alter type public.app_type
add value if not exists 'case_types';

alter type public.app_type
add value if not exists 'case_records';
