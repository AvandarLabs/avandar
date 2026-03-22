/**
 * A composite type that wraps a text value.
 *
 * This is a workaround to Supabase TypeScript type-generation that does not
 * allow nullable parameters in postgres functions.
 *
 * By wrapping a function parameter in a composite type, we can make the
 * generated TypeScript function allow a null value for that parameter.
 * But it will need to be wrapped in a `{ value }` object.
 *
 * This works because Postgres enforces that all fields in a composite type
 * are nullable, and Supabase correctly generates TypeScript types where all
 * values in a composite type are marked as nullable. So if we wrap function
 * parameters in a composite type, they become nullable.
 */
create type public.util__nullable_text as (
  value text
);
