import {
  DEFAULT_CSV_ESCAPE_CHAR,
  DEFAULT_CSV_QUOTE_CHAR,
} from "@/clients/DuckDbClient/csvParse/csvParse.constants";
import { normalizeDuckDbCsvOptionToken } from "@/clients/DuckDbClient/csvParse/csvParseOptions";

/** Bytes read from each probe offset when sniff did not detect a quote char. */
export const CSV_QUOTE_PROBE_CHUNK_SIZE = 65_536;

/**
 * File offsets (by size fraction) checked for `"` when the sniff sample only
 * covered unquoted rows. Late-quoted fields (e.g. `LONG_global_deaths.csv`)
 * otherwise keep `quoteChar` null and Phase B loads an empty table in wasm.
 */
export const CSV_QUOTE_PROBE_OFFSET_FRACTIONS = [0, 0.25, 0.5, 0.75] as const;

/**
 * Resolves quote char from sniff metadata and optional UTF-8 probe chunks.
 */
export function inferQuoteCharFromSniffAndProbeTexts(options: {
  sniffQuoteToken: string | null | undefined;
  probeTexts: readonly string[];
}): string | null {
  const quoteFromSniff = normalizeDuckDbCsvOptionToken(options.sniffQuoteToken);
  if (quoteFromSniff != null) {
    return quoteFromSniff;
  }

  for (const text of options.probeTexts) {
    if (text.includes('"')) {
      return DEFAULT_CSV_QUOTE_CHAR;
    }
  }

  return null;
}

async function _blobSliceToUtf8Text(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") {
    return blob.text();
  }

  return new Response(blob).text();
}

async function _readCsvQuoteProbeTexts(file: File): Promise<string[]> {
  if (file.size === 0) {
    return [];
  }

  const texts: string[] = [];
  for (const fraction of CSV_QUOTE_PROBE_OFFSET_FRACTIONS) {
    const start = Math.min(
      Math.floor(file.size * fraction),
      Math.max(0, file.size - 1),
    );
    const chunk = file.slice(start, start + CSV_QUOTE_PROBE_CHUNK_SIZE);
    texts.push(await _blobSliceToUtf8Text(chunk));
  }

  return texts;
}

/**
 * Enables RFC quoting when DuckDB `sniff_csv` reports `(empty)` but the file
 * contains double quotes outside the sniff window.
 */
export async function inferQuoteCharWhenSniffReportsEmpty(options: {
  file: File;
  sniffQuoteToken: string | null | undefined;
}): Promise<string | null> {
  const probeTexts = await _readCsvQuoteProbeTexts(options.file);
  return inferQuoteCharFromSniffAndProbeTexts({
    sniffQuoteToken: options.sniffQuoteToken,
    probeTexts,
  });
}

/**
 * Applies {@link inferQuoteCharWhenSniffReportsEmpty} and pairs escape when
 * quote was inferred.
 */
export async function applyQuoteProbeToParseOptions<
  T extends {
    quoteChar: string | null;
    escapeChar: string | null;
  },
>(options: {
  file: File;
  sniffQuoteToken: string | null | undefined;
  parseOptions: T;
}): Promise<T> {
  const quoteChar = await inferQuoteCharWhenSniffReportsEmpty({
    file: options.file,
    sniffQuoteToken: options.sniffQuoteToken,
  });

  if (quoteChar == null) {
    return options.parseOptions;
  }

  return {
    ...options.parseOptions,
    quoteChar,
    escapeChar: options.parseOptions.escapeChar ?? DEFAULT_CSV_ESCAPE_CHAR,
  };
}
