/**
 * Replaces one catalog listing's relation columns with the columns and types
 * read from a sample of its source's real data, and records that their types
 * are verified. The app infers the types and the `open-data` edge function
 * calls this after checking the column names against the sample it served.
 *
 * The whole column set is replaced, in the order given: a column the source
 * does not have is deleted, and one the pipeline did not know is added. A
 * column keeps the `original_data_type` the pipeline wrote, such as a
 * Socrata type label, unless that was `unknown`, in which case the verified
 * type becomes its original type too.
 *
 * @param p_catalog_listing_id The listing.
 * @param p_columns A non-empty JSON array of `{ column_name, cast_data_type }`,
 *   in the source's column order.
 *
 * @returns The updated listing.
 *
 * @throws When an argument is null, `p_columns` is empty or names a column
 *   twice, or the listing does not exist.
 */
create or replace function public.rpc_data_catalog_listings__write_verified_column_types (
  p_catalog_listing_id uuid,
  p_columns jsonb
) returns public.data_catalog_listings as $$
declare
  v_listing public.data_catalog_listings;
  v_stale_column_ids uuid[];
begin
  if
    p_catalog_listing_id is null or
    jsonb_typeof(p_columns) is distinct from 'array' or
    jsonb_array_length(p_columns) = 0
  then
    raise exception 'rpc_data_catalog_listings__write_verified_column_types needs a listing id and a non-empty JSON array of columns';
  end if;

  if (
    select count(distinct input_column ->> 'column_name') <> count(*)
    from jsonb_array_elements(p_columns) input_column
  ) then
    raise exception 'Each column may appear only once';
  end if;

  select listing.* into v_listing
  from public.data_catalog_listings listing
  where listing.id = p_catalog_listing_id
  for update;

  if v_listing.id is null then
    raise exception 'Catalog listing % does not exist', p_catalog_listing_id;
  end if;

  select coalesce(array_agg(stored_column.id), '{}') into v_stale_column_ids
  from public.data_catalog_listings__relation_columns stored_column
  where stored_column.catalog_listing_id = p_catalog_listing_id;

  -- Inserted before the old columns are deleted, so each new column can
  -- take the original type of the stored column of the same name.
  insert into public.data_catalog_listings__relation_columns (
    catalog_listing_id,
    column_name,
    display_order,
    original_data_type,
    cast_data_type
  )
  select
    p_catalog_listing_id,
    input_column.value ->> 'column_name',
    input_column.ordinality::integer - 1,
    coalesce(
      (
        select stored_column.original_data_type
        from public.data_catalog_listings__relation_columns stored_column
        where
          stored_column.id = any (v_stale_column_ids) and
          stored_column.column_name = input_column.value ->> 'column_name' and
          stored_column.original_data_type <> 'unknown'
        limit 1
      ),
      input_column.value ->> 'cast_data_type'
    ),
    (input_column.value ->> 'cast_data_type')::public.datasets__duckdb_data_type
  from jsonb_array_elements(p_columns) with ordinality as input_column (value, ordinality);

  delete from public.data_catalog_listings__relation_columns relation_column
  where relation_column.id = any (v_stale_column_ids);

  update public.data_catalog_listings listing
  set date_column_type_last_verified = now()
  where listing.id = p_catalog_listing_id
  returning listing.* into v_listing;

  return v_listing;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: the `open-data` edge function calls this after it
-- checks the columns against the sample it served.
revoke
execute on function public.rpc_data_catalog_listings__write_verified_column_types (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_data_catalog_listings__write_verified_column_types (uuid, jsonb) to service_role;
