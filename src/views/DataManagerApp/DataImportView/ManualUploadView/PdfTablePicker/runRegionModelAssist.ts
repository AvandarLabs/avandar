import { Model } from "@avandar/models";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { APIClient } from "@/clients/APIClient";
import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { clipToRegion } from "@/workers/pdfSniff/clipToRegion";
import { joinRegionText } from "@/workers/pdfSniff/extractors/extractProseMeasures";
import { buildRegionPrompt } from "@/workers/pdfSniff/llm/buildRegionPrompt";
import { parseRegionResponse } from "@/workers/pdfSniff/llm/parseRegionResponse";
import type { Measurement } from "@/workers/pdfSniff/extractMeasurements";
import type {
  ExtractedTable,
  PageGeometry,
  PdfCellFlag,
  PdfRegion,
  RegionGeometry,
} from "@/workers/pdfSniff/types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Substring `extractProseMeasures` writes into its region-level coverage
 * note. It is the only signal that rules read far fewer figures than the
 * passage contains, which is the one situation the assistant is offered for.
 */
export const COVERAGE_FLAG_MARKER = "numbers in this region";

/**
 * Said whenever the assistant did not contribute, for any reason. The wording
 * is deliberately identical for a refusal, a dead network and an unusable
 * answer: in all three the rules stand and nothing was lost.
 */
export const KEPT_RULE_RESULTS = "Kept the rule-based results.";

const MODEL_UNITS = new Set<Measurement["unit"]>(["n", "percent", "usd"]);

/**
 * What one run of the assist did. `skipped` is not an error state: it is the
 * normal outcome of declining consent, and its `message` is what the picker
 * shows.
 */
export type RegionAssistOutcome =
  | {
      kind: "merged";
      table: ExtractedTable;
      llmModel: string;
      addedRowCount: number;
    }
  | { kind: "skipped"; message: string };

/**
 * The region-level coverage note, if the rules left one.
 *
 * `rowIndex < 0` is the region-level sentinel documented on `PdfCellFlag`; a
 * cell-level flag that happened to quote the same words is not an offer.
 */
export function findCoverageFlag(
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
    return page ? [clipToRegion(page, fragment.bbox)] : [];
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
  };
}

/**
 * Reads the rule-extracted rows back as measurements, so the prompt can tell
 * the model what has already been found. A row that does not round-trip is
 * dropped rather than guessed at: the worst outcome of dropping one is that
 * the model repeats a figure we already have.
 */
function _tableToMeasurements(table: ExtractedTable): readonly Measurement[] {
  return table.cells.slice(table.headerRows).flatMap((row) => {
    const value = Number(row[2]);
    const unit = row[3] as Measurement["unit"] | undefined;
    if (
      !Number.isFinite(value) ||
      unit === undefined ||
      !MODEL_UNITS.has(unit)
    ) {
      return [];
    }
    return [
      {
        subject: row[0] ? row[0] : null,
        metric: row[1] ?? "",
        value,
        unit,
        sourceText: row[4] ?? "",
      },
    ];
  });
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
export function mergeModelRows(
  ruleTable: ExtractedTable,
  modelTable: ExtractedTable,
): ExtractedTable {
  const hasRuleRows = ruleTable.cells.length > ruleTable.headerRows;
  return {
    regionId: ruleTable.regionId,
    headerRows: hasRuleRows ? ruleTable.headerRows : modelTable.headerRows,
    cells:
      hasRuleRows ?
        [...ruleTable.cells, ...modelTable.cells.slice(modelTable.headerRows)]
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
 * The cloud model this assist asks for, honouring the user's chat model
 * choice when it is one the workspace is allowed to spend on. An `offline:`
 * picker id is not in the catalog and so falls back to the default, which is
 * correct: this path is a cloud request or nothing.
 */
function _resolveCloudModelId(): string {
  const storedModelId = ChatModelStorage.readStoredChatModelId();
  return (
      storedModelId !== undefined &&
        ChatModelOption.Catalog.isValidId(storedModelId)
    ) ?
      storedModelId
    : ChatModelOption.Catalog.defaultId;
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
    return {
      kind: "skipped",
      message: `That region is not on a page we read. ${KEPT_RULE_RESULTS}`,
    };
  }
  const regionText = joinRegionText(geometry);
  if (regionText === "") {
    return {
      kind: "skipped",
      message: `There is no text in this region to send. ${KEPT_RULE_RESULTS}`,
    };
  }

  const prompt = buildRegionPrompt({
    regionText,
    ruleResults: _tableToMeasurements(params.ruleTable),
  });

  // `values` carries the region's text because the PII detectors read values
  // rather than text, so without it they would never see what is about to be
  // sent. `explicitConsentRequired` forces the modal even when the detectors
  // are clean: clicking the button is a request to send, not consent to
  // having sent.
  const consent = await decideIfDataCanCrossBoundary({
    text: prompt,
    values: [regionText],
    context: "user_message_text",
    workspaceId: params.workspaceId,
    userId: params.userId,
    explicitConsentRequired: true,
  });
  if (!consent.approved) {
    return { kind: "skipped", message: KEPT_RULE_RESULTS };
  }

  // The ack covers the FINAL text, which a bias-suggestion swap may have
  // rewritten, so the message we post has to be that same text.
  const content = consent.payload.text ?? prompt;
  const ackToken = await PendingAcks.consumeAckForText(content);
  const llmModel = _resolveCloudModelId();
  const response = await APIClient.post({
    route: "chat/:workspaceId/messages",
    pathParams: { workspaceId: params.workspaceId },
    body: {
      messages: [
        Model.make("ChatClientMessage", { role: "user" as const, content }),
      ],
      context: ChatPageContext.createDataSourcesViewContext(),
      model: llmModel,
      ...(ackToken ?
        {
          consentAcks: [
            {
              ackToken,
              scope: { kind: "message_index" as const, index: 0 },
            },
          ],
        }
      : {}),
    },
  });

  const modelTable = parseRegionResponse({
    regionId: params.region.id,
    pageIndex: geometry.pageIndex,
    bbox: geometry.bbox,
    responseText: response.assistantText,
  });
  const addedRowCount = modelTable.cells.length - modelTable.headerRows;
  if (addedRowCount <= 0) {
    return {
      kind: "skipped",
      message: `The assistant read nothing we could use. ${KEPT_RULE_RESULTS}`,
    };
  }

  return {
    kind: "merged",
    table: mergeModelRows(params.ruleTable, modelTable),
    llmModel,
    addedRowCount,
  };
}
