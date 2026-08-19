\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- `public.util__storage_object_dataset_id` is the load-bearing piece of the
-- fix that closed Supabase Storage as a second, ungated read path to dataset
-- content (see storage_private_dataset_guard.test.sql). Every policy on the
-- `workspaces` bucket denies access when it returns NULL, so whatever this
-- function accepts, it grants the named dataset's permissions to.
--
-- PDF import (AVA-317) retains the user's original file next to the parquet,
-- because a PDF cannot be reconstructed from the parquet we extract from it:
--
--   <workspaceId>/datasets/<datasetId>.parquet         the transcoded data
--   <workspaceId>/datasets/<datasetId>.original.<ext>  the retained source
--
-- This test pins BOTH halves of the contract. The rejections matter at least
-- as much as the acceptances: an object name that merely STARTS with a
-- dataset uuid must not be able to claim that dataset's permissions.
--
select plan(23);

-- Accepted shapes ----------------------------------------------------------

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.parquet'
  ),
  'c3007001-0000-4000-8000-000000000001'::uuid,
  'accepts the transcoded parquet (existing behaviour must not regress)'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.pdf'
  ),
  'c3007001-0000-4000-8000-000000000001'::uuid,
  'accepts a retained original PDF'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.xlsx'
  ),
  'c3007001-0000-4000-8000-000000000001'::uuid,
  'accepts a retained original XLSX'
);

-- Storage clients and operating systems are inconsistent about extension
-- case, and the extension is not a security boundary: the dataset id in front
-- of it is. Rejecting `.PDF` would only produce mysterious upload failures.
select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.PDF'
  ),
  'c3007001-0000-4000-8000-000000000001'::uuid,
  'accepts an upper-case original extension'
);

-- Boundary of the extension length cap, from the accepting side.
select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.abcdefghij'
  ),
  'c3007001-0000-4000-8000-000000000001'::uuid,
  'accepts a ten-character original extension'
);

-- Rejected shapes: the stem is not a dataset id -----------------------------

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/not-a-uuid.original.pdf'
  ),
  null::uuid,
  'rejects a non-uuid stem'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/ c3007001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects leading whitespace before the dataset id'
);

-- Rejected shapes: the suffix is not on the allow-list ----------------------

-- The important one. Matching a bare LEADING uuid would let any object name
-- claim a dataset's permissions.
select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.exe'
  ),
  null::uuid,
  'rejects an unknown extension rather than accepting any leading uuid'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001'
  ),
  null::uuid,
  'rejects a bare uuid with no suffix'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original'
  ),
  null::uuid,
  'rejects `.original` with no extension following it'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.'
  ),
  null::uuid,
  'rejects an empty original extension'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original..pdf'
  ),
  null::uuid,
  'rejects a doubled dot before the original extension'
);

-- An over-long "extension" looks like smuggled content rather than a file
-- type. Eleven characters, one past the cap.
select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.abcdefghijk'
  ),
  null::uuid,
  'rejects an over-long original extension'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.pdf.exe'
  ),
  null::uuid,
  'rejects a second extension appended after the original extension'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.parquet.original.pdf'
  ),
  null::uuid,
  'rejects `.parquet` followed by more path characters'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.p df'
  ),
  null::uuid,
  'rejects a space inside the original extension'
);

-- Rejected shapes: the path shape is wrong ---------------------------------

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.original.pdf/extra'
  ),
  null::uuid,
  'rejects a fourth path segment'
);

-- `split_part(name, '/', 4) = ''` is TRUE for a trailing slash, so a depth
-- guard written that way would let this through.
select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.parquet/'
  ),
  null::uuid,
  'rejects a trailing slash after the file name'
);

-- Likewise TRUE for an empty fourth segment followed by a fifth.
select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.parquet//extra'
  ),
  null::uuid,
  'rejects an empty fourth segment followed by a fifth'
);

select is(
  public.util__storage_object_dataset_id (
    'datasets/c3007001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a name with no workspace segment'
);

select is(
  public.util__storage_object_dataset_id (
    'c3001001-0000-4000-8000-000000000001/originals/c3007001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a folder other than `datasets`'
);

-- Anchoring ----------------------------------------------------------------
--
-- Postgres ARE anchors `^` and `$` to the whole string unless newline-
-- sensitive matching is switched on, which it is not here. These two cases
-- pin that, because a PCRE-style `$` matching before a trailing newline, or a
-- multiline `^`, would each be a real bypass: Storage object names are
-- arbitrary text and can contain newlines.
select is(
  public.util__storage_object_dataset_id (
    E'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.parquet\n'
  ),
  null::uuid,
  'rejects a trailing newline after an otherwise valid name'
);

select is(
  public.util__storage_object_dataset_id (
    E'c3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.exe\nc3001001-0000-4000-8000-000000000001/datasets/c3007001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a valid line smuggled after a newline'
);

select * from finish();

rollback;
