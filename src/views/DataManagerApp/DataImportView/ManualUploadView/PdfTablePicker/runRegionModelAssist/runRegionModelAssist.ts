import { APIClient } from "@/clients/APIClient";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { clipToRegion } from "@/workers/pdfSniff/clipToRegion/clipToRegion";
import { joinRegionText } from "@/workers/pdfSniff/extractors/extractProseMeasures/extractProseMeasures";
import { parseRegionResponse } from "@/workers/pdfSniff/llm/parseRegionResponse/parseRegionResponse";
import { tableToMeasurements } from "@/workers/pdfSniff/llm/tableToMeasurements";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  ExtractedTable,
  PageGeometry,
  PdfCellFlag,
  PdfRegion,
  RegionGeometry,
} from "@/workers/pdfSniff/pdfSniff.types";

/**
 * Substring `extractProseMeasures` writes into its region-level coverage
 * note. It is the only signal that rules read far fewer figures than the
 * passage contains, which is the one situation the assistant is offered for.
 */
export const COVERAGE_FLAG_MARKER = "numbers in this region";

export type RegionAssistSkipReason =
  | "region_not_on_page"
  | "no_text"
  | "consent_declined"
  | "empty_model_response";

/**
 * What one run of the assist did. `skipped` is not an error state: it is the
 * normal outcome of declining consent, and its `reason` is what the picker
 * translates for display.
 */
export type RegionAssistOutcome =
  | {
      kind: "merged";
      table: ExtractedTable;
      llmModel: string;
      addedRowCount: number;
    }
  | { kind: "skipped"; reason: RegionAssistSkipReason };

/**
 * The region-level coverage note, if the rules left one.
 *
 * `rowIndex < 0` is the region-level sentinel documented on `PdfCellFlag`; a
 * cell-level flag that happened to quote the same words is not an offer.
 */
export function getCoverageFlagFromTable(
  table: ExtractedTable | undefined,
): PdfCellFlag | undefined {
  return table?.flags.find((flag) => {
    return flag.rowIndex < 0 && flag.detail.includes(COVERAGE_FLAG_MARKER);
  });
}

/**
 * Narrows the pages to one region, exactly as the worker does before
 * extracting it. Reusing `clipToRegion` here is what keeps "what the
 * assistant is sent" identical to "what the user drew a box around".
 */
function _mergeRegionGeometry(
  pages: readonly PageGeometry[],
  region: PdfRegion,
): RegionGeometry | undefined {
  const pagesByIndex = new Map(
    pages.map((page) => {
      return [page.pageIndex, page];
    }),
  );
  const clipped = region.fragments.flatMap((fragment) => {
    const page = pagesByIndex.get(fragment.page);
    return page ? [clipToRegion({ page, bbox: fragment.bbox })] : [];
  });
  const firstClip = clipped[0];
  if (!firstClip) {
    return undefined;
  }
  return {
    pageIndex: firstClip.pageIndex,
    bbox: firstClip.bbox,
    textItems: clipped.flatMap((clip) => {
      return clip.textItems;
    }),
    rules: clipped.flatMap((clip) => {
      return clip.rules;
    }),
    marks: clipped.flatMap((clip) => {
      return clip.marks;
    }),
  };
}

/**
 * Appends the model's rows to the rule-based ones.
 *
 * Rules come first because they are the results the user has already been
 * shown, and a reviewer reading top to bottom should meet the trusted rows
 * before the ones that need checking. The merged table is marked
 * `extractedBy: "model"` even though most of its rows came from rules:
 * `extractedBy` is per table, and over-attributing to the model only ever
 * sends a reviewer to look, never away.
 */
export function mergeModelRows(options: {
  ruleTable: ExtractedTable;
  modelTable: ExtractedTable;
}): ExtractedTable {
  const { ruleTable, modelTable } = options;
  const hasRuleRows = ruleTable.cells.length > ruleTable.headerRows;
  return {
    regionId: ruleTable.regionId,
    headerRows: hasRuleRows ? ruleTable.headerRows : modelTable.headerRows,
    cells: hasRuleRows
      ? [...ruleTable.cells, ...modelTable.cells.slice(modelTable.headerRows)]
      : modelTable.cells,
    extractedBy: "model",
    // The coverage note was the offer, and the offer has been taken.
    flags: ruleTable.flags.filter((flag) => {
      return !(flag.rowIndex < 0 && flag.detail.includes(COVERAGE_FLAG_MARKER));
    }),
    rowProvenance: [...ruleTable.rowProvenance, ...modelTable.rowProvenance],
    // The rule rows keep their index, so their units stay aligned without
    // padding. The model's rows name their unit in a column of their own and
    // never need this array.
    rowUnits: hasRuleRows ? ruleTable.rowUnits : modelTable.rowUnits,
  };
}

/**
 * Asks the user to send the region's text, and returns the text they agreed
 * to with its consent ack, or nothing when they declined.
 *
 * `values` carries the region's text because the PII detectors read values
 * rather than text, so without it they would never see what is about to be
 * sent. `explicitConsentRequired` forces the modal even when the detectors
 * are clean: clicking the button is a request to send, not consent to having
 * sent. The ack covers the FINAL text, which a bias-suggestion swap may have
 * rewritten, so the text posted has to be that same text; the server refuses
 * the request without it.
 */
async function _askToSend(
  params: Readonly<{ workspaceId: Workspace.Id; userId: string }>,
  regionText: string,
): Promise<{ text: string; ackToken: string } | undefined> {
  const consent = await decideIfDataCanCrossBoundary({
    text: regionText,
    values: [regionText],
    context: "user_message_text",
    workspaceId: params.workspaceId,
    userId: params.userId,
    explicitConsentRequired: true,
  });
  if (!consent.approved) {
    return undefined;
  }
  const text = consent.payload.text ?? regionText;
  const ackToken = await PendingAcks.consumeAckForText(text);
  return ackToken ? { text, ackToken } : undefined;
}

/**
 * Reads the assistant's reply into rows and appends them to the rule-based
 * rows, or skips when it added nothing.
 */
function _toOutcome(
  options: Readonly<{
    ruleTable: ExtractedTable;
    regionId: string;
    geometry: RegionGeometry;
    response: { responseText: string; model: string };
  }>,
): RegionAssistOutcome {
  const modelTable = parseRegionResponse({
    regionId: options.regionId,
    pageIndex: options.geometry.pageIndex,
    bbox: options.geometry.bbox,
    responseText: options.response.responseText,
  });
  const addedRowCount = modelTable.cells.length - modelTable.headerRows;
  if (addedRowCount <= 0) {
    return { kind: "skipped", reason: "empty_model_response" };
  }
  return {
    kind: "merged",
    table: mergeModelRows({ ruleTable: options.ruleTable, modelTable }),
    llmModel: options.response.model,
    addedRowCount,
  };
}

/**
 * Asks the assistant to finish what the rules could not read in one region.
 *
 * This is the only route from PDF import to a model, and it goes through
 * `decideIfDataCanCrossBoundary`. That is not decoration: the consent gate is
 * what writes the workspace privacy log, so a second route would make that
 * log an incomplete answer to "did a model ever see this document".
 *
 * Only the region's own text is sent. A user who drew a box around one
 * paragraph consented to that paragraph, not to the file.
 *
 * Everything that can go wrong, from a refusal to a dead network to an answer
 * that will not parse, returns `skipped` with something to say. The
 * rule-based rows are never touched on any of those paths, which is what
 * makes "this works offline" a promise rather than a hope.
 */
export async function runRegionModelAssist(
  params: Readonly<{
    pages: readonly PageGeometry[];
    region: PdfRegion;
    ruleTable: ExtractedTable;
    workspaceId: Workspace.Id;
    userId: string;
  }>,
): Promise<RegionAssistOutcome> {
  const geometry = _mergeRegionGeometry(params.pages, params.region);
  if (!geometry) {
    return { kind: "skipped", reason: "region_not_on_page" };
  }
  const regionText = joinRegionText(geometry);
  if (regionText === "") {
    return { kind: "skipped", reason: "no_text" };
  }

  const consented = await _askToSend(params, regionText);
  if (!consented) {
    return { kind: "skipped", reason: "consent_declined" };
  }
  // The assistant's own route holds the prompt and answers with the
  // server's model; the figures the rules found are sent so the model adds
  // only what they missed.
  const response = await APIClient.post({
    route: "chat/:workspaceId/extract-measurements",
    pathParams: { workspaceId: params.workspaceId },
    body: {
      regionText: consented.text,
      alreadyExtracted: tableToMeasurements(params.ruleTable).map((figure) => {
        return { metric: figure.metric, value: figure.value };
      }),
      ackToken: consented.ackToken,
    },
  });

  return _toOutcome({
    ruleTable: params.ruleTable,
    regionId: params.region.id,
    geometry,
    response,
  });
}
