/**
 * Why a catalog listing's dataset cannot be loaded, when it cannot.
 *
 * - `empty_dataset`: the source file has no bytes.
 * - `dataset_not_found`: the source no longer has the dataset or resource.
 * - `authorization_required`: the source wants credentials Avandar does not
 *   hold.
 * - `unsupported_format`: the resource is not a file Avandar can read as a
 *   table, such as an archive or a link to an upstream API.
 * - `external_host`: the resource's file is served from a host other than
 *   the catalogued API, which Avandar does not fetch from.
 * - `unparseable_dataset`: the file was read, but DuckDB could not parse it
 *   as a table.
 * - `unreachable_dataset`: the catalog's API answered, but the file's host
 *   did not. This may be temporary.
 */
create type public.data_catalog_listings__invalid_dataset_reason as enum(
  'empty_dataset',
  'dataset_not_found',
  'authorization_required',
  'unsupported_format',
  'external_host',
  'unparseable_dataset',
  'unreachable_dataset'
);
