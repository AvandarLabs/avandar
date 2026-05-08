-- Enum label only (separate migration so it commits before any function or
-- literal uses `'xls_file'` — avoids enum recreate / drop-type ordering issues
-- with `rpc_datasets__add_dataset`, and avoids PG rules about new enum values
-- in the same transaction as `ALTER TYPE ... ADD VALUE`).
alter type "public"."datasets__source_type"
add value if not exists 'xls_file';
