import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { buildMeasurementExtractionMessage } from "$/agent/measurementExtraction/MeasurementExtractionPrompt";
import { clipToRegion } from "@/workers/pdfSniff/clipToRegion/clipToRegion";
import {
  extractProseMeasures,
  joinRegionText,
} from "@/workers/pdfSniff/extractors/extractProseMeasures/extractProseMeasures";
import { extractPageGeometry } from "@/workers/pdfSniff/extractPageGeometry/extractPageGeometry";
import { tableToMeasurements } from "@/workers/pdfSniff/llm/tableToMeasurements";
import { loadPdfDocument } from "@/workers/pdfSniff/loadPdfDocument/loadPdfDocument";
import { PDF_ASSIST_FILES } from "./pdfAssistCases";
import type { PdfAssistCase } from "./pdfAssistCases";
import type { Measurement } from "@/workers/pdfSniff/extractMeasurements/extractMeasurements";
import type {
  ExtractedTable,
  PageGeometry,
} from "@/workers/pdfSniff/pdfSniff.types";

/** A region ready to send: its text, the rules' rows, and the app's prompt. */
export type PreparedPdfAssistCase = {
  testCase: PdfAssistCase;
  regionText: string;
  ruleTable: ExtractedTable;
  ruleResults: readonly Measurement[];
  /**
   * The message the assistant's model reads, as the server builds it; the
   * `chat-route` setup sends it as a chat message.
   */
  prompt: string;
};

const pageCache = new Map<string, Promise<PageGeometry>>();

async function _loadPage(
  path: string,
  pageNumber: number,
): Promise<PageGeometry> {
  const document = await loadPdfDocument(new Uint8Array(await readFile(path)));
  const page = await extractPageGeometry({
    page: await document.getPage(pageNumber),
    pageIndex: pageNumber - 1,
  });
  await document.destroy();
  return page;
}

/**
 * Builds what the app builds when a user sends a region to the assistant:
 * the region's text (`joinRegionText`), the rule-based rows
 * (`extractProseMeasures`), and the prompt that lists those rows as already
 * extracted.
 */
export async function preparePdfAssistCase(
  repoRoot: string,
  testCase: PdfAssistCase,
): Promise<PreparedPdfAssistCase> {
  const file = PDF_ASSIST_FILES[testCase.file];
  const path = isAbsolute(file) ? file : join(repoRoot, file);
  const key = `${path}#${testCase.page}`;
  if (!pageCache.has(key)) {
    pageCache.set(key, _loadPage(path, testCase.page));
  }
  const region = clipToRegion({
    page: await pageCache.get(key)!,
    bbox: testCase.bbox,
  });
  const regionText = joinRegionText(region);
  const ruleTable = extractProseMeasures(region, { regionId: testCase.id });
  const ruleResults = tableToMeasurements(ruleTable);
  return {
    testCase,
    regionText,
    ruleTable,
    ruleResults,
    prompt: buildMeasurementExtractionMessage({
      regionText,
      alreadyExtracted: ruleResults,
    }),
  };
}
