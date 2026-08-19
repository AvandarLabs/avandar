-- What kind of content a PDF region holds, which decides how it is extracted.
--
--   grid_table        - ruled or aligned cells. The classic table.
--   labelled_graphic  - a map, chart or KPI tile whose values are text items
--                       at coordinates, associated with their labels only by
--                       position. Reading order does not preserve the pairing.
--   repeating_blocks  - numbered headings with run-in labels, the standard
--                       house style of OCHA, WHO and UNHCR situation reports.
--   prose_measures    - measurements embedded in sentences.
--
-- Keep new values at the end: moving one is not a rename, it forces a full
-- rebuild of the type and a rewrite of every column using it.
create type public.datasets__pdf_region_shape as enum(
  'grid_table',
  'labelled_graphic',
  'repeating_blocks',
  'prose_measures'
);
