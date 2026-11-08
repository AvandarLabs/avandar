/**
 * The period a per-period field groups its rows by. A row belongs to the
 * period that starts on `date_trunc(<value>, <the mapping's date column>)`.
 *
 * Enum values:
 *
 * `day` - One calendar day.
 *
 * `week` - One ISO week, starting on Monday.
 *
 * `month` - One calendar month.
 *
 * `quarter` - One calendar quarter, starting in January, April, July, or
 *  October.
 *
 * `year` - One calendar year.
 *
 * Note: Each value is also the DuckDB `date_trunc` part of the same name.
 * Keep new values at the end.
 */
create type public.concept_attributes__bucket_grain as enum(
  'day',
  'week',
  'month',
  'quarter',
  'year'
);
