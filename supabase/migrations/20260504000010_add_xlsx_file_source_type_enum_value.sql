-- New enum label must be committed before it can be used (PG 55P04).
alter type public.datasets__source_type
add value if not exists 'xlsx_file';
