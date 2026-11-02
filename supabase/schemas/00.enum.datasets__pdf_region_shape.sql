/**
 * What kind of content a PDF region holds, which decides how it is extracted.
 *
 * Enum values:
 *
 * `grid_table` - Ruled or aligned cells. The classic table.
 *
 * `labelled_graphic` - A map, chart or KPI tile whose values are text items
 *  at coordinates, associated with their labels only by position. Reading
 *  order does not preserve the pairing.
 *
 * `repeating_blocks` - Numbered headings with run-in labels, the standard
 *  house style of OCHA, WHO and UNHCR situation reports.
 *
 * `prose_measures` - Measurements embedded in sentences.
 *
 * Note: Keep new values at the end. Moving one is not a rename, it forces a
 * full rebuild of the type and a rewrite of every column using it.
 */
create type public.datasets__pdf_region_shape as enum(
  'grid_table',
  'labelled_graphic',
  'repeating_blocks',
  'prose_measures'
);
