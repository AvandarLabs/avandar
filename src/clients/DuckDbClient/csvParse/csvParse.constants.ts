/**
 * Maximum rejected rows DuckDB stores per CSV scan (see DuckDbClient docstring).
 */
export const REJECTED_ROW_STORAGE_LIMIT = 1001;

/** Sniff sample size for DuckDB `sniff_csv` / `read_csv` auto-detect. */
export const CSV_SNIFF_SAMPLE_SIZE = 20_480;

/**
 * Parse attempts: initial sniff+load, then optional retry with refined options.
 */
/** Sniff+load cycles: quote inference, relaxed strict, cleared column types, rejects. */
export const MAX_CSV_PARSE_ATTEMPTS = 5;

/** Default double-quote when sniff reports `(empty)` and rejects indicate mis-split rows. */
export const DEFAULT_CSV_QUOTE_CHAR = '"';

/** Default escape when enabling quote for RFC-style doubled-quote fields. */
export const DEFAULT_CSV_ESCAPE_CHAR = '"';
