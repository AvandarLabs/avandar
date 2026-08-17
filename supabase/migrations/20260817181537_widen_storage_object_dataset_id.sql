-- Widen public.util__storage_object_dataset_id to recognise retained original
-- files alongside the transcoded parquet.
--
-- PDF import retains the user's source file, because a PDF cannot be
-- reconstructed from the parquet extracted out of it. When cloud sync is
-- allowed, that original is uploaded to the private `workspaces` bucket next
-- to the parquet:
--
--   <workspaceId>/datasets/<datasetId>.parquet         the transcoded data
--   <workspaceId>/datasets/<datasetId>.original.<ext>  the retained source
--
-- Every policy on the `workspaces` bucket gates on this function and denies
-- when it returns NULL (see
-- 20260813151500_STORAGE-gate-workspaces-bucket-on-dataset-access.sql), so the
-- second shape was unreachable while the regex was hardcoded to `\.parquet$`.
--
-- The suffix stays an allow-list rather than becoming a bare leading-uuid
-- match: whatever this function accepts is granted the named dataset's
-- permissions, so accepting any name that merely BEGINS with a uuid would let
-- an arbitrary object claim a dataset it does not represent.
--
-- The whole object name is now matched, rather than only segment 3, which
-- additionally tightens two shapes the previous definition accepted: a folder
-- other than `datasets`, and a path deeper than three segments (a trailing
-- slash, or an empty segment followed by more). Those were already denied at
-- the policy level by the separate `storage.foldername(name)[2] = 'datasets'`
-- check, so this is a tightening of the helper, not a change in reachable
-- access.
--
set
  check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__storage_object_dataset_id (p_object_name text) RETURNS uuid LANGUAGE sql IMMUTABLE
SET
  search_path TO 'public' AS $function$
  select case
    when p_object_name ~
      '^[^/]+/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.parquet|\.original\.[A-Za-z0-9]{1,10})$'
    -- Safe: the regex above has already proven segment 3 begins with a uuid,
    -- and a uuid contains no dot, so field 1 of the dot-split is exactly it.
    then split_part(split_part(p_object_name, '/', 3), '.', 1)::uuid
    else null
  end;
$function$;
