\set ON_ERROR_STOP on

begin;

select plan(6);

-- The column itself.

select has_column(
  'public',
  'datasets__google_sheets',
  'sheet_name',
  'datasets__google_sheets names the tab that backs the relation'
);

select col_is_null(
  'public',
  'datasets__google_sheets',
  'sheet_name',
  'sheet_name is nullable, so rows imported before the column keep meaning "the first tab"'
);

-- The RPC contract. The tab argument is a `util__nullable_text` wrapper and not
-- a bare `text`, because Supabase's type generator will not emit a nullable
-- scalar parameter. `rpc_datasets__add_xlsx_file_dataset` already does this for
-- the identical column.

select has_function(
  'public',
  'rpc_datasets__add_google_sheets_dataset',
  array[
    'uuid',
    'uuid',
    'text',
    'text',
    'dataset_column_input[]',
    'text',
    'text',
    'integer',
    'util__nullable_text'
  ]::name[],
  'google sheets RPC takes the tab as a nullable-text wrapper'
);

-- `create or replace function` with a changed argument list creates an
-- *overload* rather than replacing, and two overloads reachable by one name make
-- PostgREST ambiguous. The generated migration has to have dropped the old
-- eight-argument signature, so exactly one function may carry this name.

select hasnt_function(
  'public',
  'rpc_datasets__add_google_sheets_dataset',
  array[
    'uuid',
    'uuid',
    'text',
    'text',
    'dataset_column_input[]',
    'text',
    'text',
    'integer'
  ]::name[],
  'the pre-tab eight-argument signature is gone rather than left as an overload'
);

select is(
  (
    select count(*)
    from pg_proc
    where proname = 'rpc_datasets__add_google_sheets_dataset'
  ),
  1::bigint,
  'exactly one rpc_datasets__add_google_sheets_dataset exists'
);

-- The insert actually stores the value it is handed. `has_function` above would
-- pass on a signature that accepted the argument and dropped it on the floor.

select is(
  (
    select count(*)
    from pg_proc p
    where p.proname = 'rpc_datasets__add_google_sheets_dataset'
      and pg_get_functiondef(p.oid) like '%p_sheet_name.value%'
  ),
  1::bigint,
  'the RPC body writes p_sheet_name.value into the table'
);

select * from finish();

rollback;
