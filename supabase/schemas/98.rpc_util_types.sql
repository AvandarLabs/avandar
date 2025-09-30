/**
 * A composite type that wraps a text value.
 *
 * This is a workaround to Supabase type inference that does not allow nullable
 * parameters in postgres functions.
 * 
 * Postgres enforces all fields in a composite type to be are nullable,
 * so by wrapping a value in a composite type, we can make the wrapped
 * type nullable.
 */
create type public.util__nullable_text as (
  value text
);
