/**
 * How a PDF table's structure was determined.
 *
 * Enum values:
 *
 * `tagged` - Read from the PDF's own logical structure tree. Ground truth
 *  rather than inference, because the generator recorded the cell grid. Only
 *  around 10-15% of PDFs are tagged at all.
 *
 * `lattice` - Derived from ruling lines in the page content stream. Read from
 *  the vector geometry directly, so no rasterisation is involved.
 *
 * `stream` - Guessed from whitespace and text alignment, for tables drawn
 *  with no ruling lines. Least reliable, and always surfaced to the user as a
 *  guess.
 *
 * `manual` - A region the user drew themselves. Defined ahead of the manual
 *  region-selection feature so that shipping it needs no enum migration.
 *
 * Note: This type is live even though no column declares it. Each entry in
 * `datasets__pdf_file.regions` carries its own `detectionMode`, so the values
 * are referenced from inside that jsonb. Declaring it here is what stops
 * `db diff` dropping the type, and it is the canonical list the Zod enum in
 * `PdfFileDatasetParsers.ts` mirrors.
 *
 * Note: Keep new values at the end. Moving one is not a rename, it forces a
 * full rebuild of the type and a rewrite of every column using it.
 */
create type public.datasets__pdf_detection_mode as enum('tagged', 'lattice', 'stream', 'manual');
