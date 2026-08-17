/**
 * How a PDF table's structure was determined.
 *
 * - `tagged`:  read from the PDF's own logical structure tree. Ground truth.
 * - `lattice`: derived from ruling lines in the page content stream.
 * - `stream`:  guessed from whitespace and text alignment. Least reliable.
 * - `manual`:  a region the user drew themselves.
 *
 * `manual` is defined now although nothing produces it until the manual
 * region-selection feature ships, so that adding that feature needs no
 * enum migration.
 */
create type public.datasets__pdf_detection_mode as enum(
  'tagged',
  'lattice',
  'stream',
  'manual'
);
