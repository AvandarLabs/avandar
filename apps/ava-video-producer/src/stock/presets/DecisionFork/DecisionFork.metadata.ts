import { z } from "zod";
import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DECISION_FORK_DEFAULT_INPUT } from "./DecisionFork.fixtures";
import authoredMetadata from "./DecisionFork.metadata.yaml";
import { decisionForkBranchSchema } from "./DecisionFork.schema";
import type {
  StockControl,
  StockMessageDescriptor,
  StockMetadata,
} from "../../contracts/StockContract.types";
import type { DecisionForkInput } from "./DecisionFork.schema";

function _message(
  options: Readonly<{ key: string; message: string }>,
): StockMessageDescriptor {
  return {
    id: `motionAtlas.decision-fork.${options.key}`,
    message: options.message,
  };
}

/**
 * Public semantic copy uses serializable descriptors without source records.
 */
export const decisionForkMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Editable content fields include nested branch items and live ID options. */
export const decisionForkControls: StockControl[] = [
  {
    kind: "text",
    path: "prompt",
    minLength: 1,
    maxLength: 52,
    label: _message({
      key: "controls.prompt.label",
      message: "Decision prompt",
    }),
    help: _message({
      key: "controls.prompt.help",
      message: "The single decision being evaluated.",
    }),
  },
  {
    kind: "collection",
    path: "branches",
    minItems: 2,
    maxItems: 4,
    label: _message({ key: "controls.branches.label", message: "Branches" }),
    help: _message({
      key: "controls.branches.help",
      message: "Mutually presented alternatives and their authored outcomes.",
    }),
    itemSchema: z.toJSONSchema(decisionForkBranchSchema),
    itemControls: [
      {
        kind: "text",
        path: "id",
        minLength: 0,
        maxLength: 20,
        label: _message({
          key: "controls.branches.id.label",
          message: "Branch ID",
        }),
      },
      {
        kind: "text",
        path: "condition",
        minLength: 0,
        maxLength: 24,
        label: _message({
          key: "controls.branches.condition.label",
          message: "Condition",
        }),
      },
      {
        kind: "text",
        path: "outcome",
        minLength: 0,
        maxLength: 24,
        label: _message({
          key: "controls.branches.outcome.label",
          message: "Outcome",
        }),
      },
    ],
  },
  {
    kind: "select",
    path: "selectedBranchId",
    label: _message({
      key: "controls.selectedBranchId.label",
      message: "Selected branch",
    }),
    help: _message({
      key: "controls.selectedBranchId.help",
      message: "The one branch taken by the illustrated scenario.",
    }),
    optionsFrom: { path: "branches", valueKey: "id", labelKey: "condition" },
  },
  {
    kind: "text",
    path: "scenarioLabel",
    minLength: 1,
    maxLength: 32,
    label: _message({
      key: "controls.scenarioLabel.label",
      message: "Scenario label",
    }),
    help: _message({
      key: "controls.scenarioLabel.help",
      message:
        "Label attached to the single marker moving through the decision.",
    }),
  },
  {
    kind: "text",
    path: "selectionLabel",
    minLength: 0,
    maxLength: 32,
    label: _message({
      key: "controls.selectionLabel.label",
      message: "Selection label",
    }),
    help: _message({
      key: "controls.selectionLabel.help",
      message: "Qualification accompanying the selected outcome.",
    }),
  },
  {
    kind: "boolean",
    path: "showUnchosenOutcomes",
    label: _message({
      key: "controls.showUnchosenOutcomes.label",
      message: "Show unchosen outcomes",
    }),
    help: _message({
      key: "controls.showUnchosenOutcomes.help",
      message:
        "Keep the alternative outcomes visible during the selected-path hold.",
    }),
  },
];

/** Visible example-copy paths for consumers localizing an omitted input. */
export const DECISION_FORK_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["prompt"],
  ["branches", 0, "condition"],
  ["branches", 0, "outcome"],
  ["branches", 1, "condition"],
  ["branches", 1, "outcome"],
  ["branches", 2, "condition"],
  ["branches", 2, "outcome"],
  ["scenarioLabel"],
  ["selectionLabel"],
];

/** A complete authored binding demonstrates validation, not source parsing. */
export const decisionForkBindingExamples: Array<{
  sourceText: StockMessageDescriptor;
  input: DecisionForkInput;
}> = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "In the fictional sketch workflow, a sketch ready to share goes to the review folder rather than the notebook or archive.",
    }),
    input: DECISION_FORK_DEFAULT_INPUT,
  },
];

/** Standard public metadata export retains the established descriptor API. */
export const metadata: StockMetadata = decisionForkMetadata;
