/**
 * What kind of column a data dictionary entry describes.
 *
 * Enum values:
 *
 * `categorical`: named groups, such as sex or outcome. May carry code lists.
 *
 * `ordered`: levels with an order, such as low to high. May carry code
 * lists; the primary list's pair order is the scale's order.
 *
 * `number`: a measurement or count, optionally with a unit and a valid range.
 *
 * `date`: a date or a timestamp.
 *
 * `text`: free text.
 *
 * `identifier`: a value unique to each row, such as a case number.
 */
create type public.data_dictionaries__entry_kind as enum(
  'categorical',
  'ordered',
  'number',
  'date',
  'text',
  'identifier'
);
