-- How a PDF table's structure was determined.
--
--   tagged  - read from the PDF's own logical structure tree. Ground truth
--             rather than inference, because the generator recorded the cell
--             grid; only around 10-15% of PDFs are tagged at all.
--   lattice - derived from ruling lines in the page content stream. Read from
--             the vector geometry directly, so no rasterisation is involved.
--   stream  - guessed from whitespace and text alignment, for tables drawn
--             with no ruling lines. Least reliable, and always surfaced to
--             the user as a guess.
--   manual  - a region the user drew themselves.
--
-- `manual` is defined now although nothing produces it until the manual
-- region-selection feature ships, so that adding that feature needs no enum
-- migration.
--
-- Keep new values at the end: moving one is not a rename, it forces a full
-- rebuild of the type and a rewrite of every column using it.
create type public.datasets__pdf_detection_mode as enum(
  'tagged',
  'lattice',
  'stream',
  'manual'
);
