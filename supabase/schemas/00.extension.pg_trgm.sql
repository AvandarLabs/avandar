/**
 * Trigram matching, which lets catalog search match a partial or misspelled
 * word in a listing's name. Installed in `extensions`, where Supabase keeps
 * extensions, so callers with an empty `search_path` name its functions and
 * operators by schema.
 */
create extension if not exists pg_trgm
with
  schema extensions;
