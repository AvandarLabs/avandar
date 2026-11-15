import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseRepairObligations } from "../ReleaseRepairObligations";
import { releaseRepairObligationsContract } from "../ReleaseRepairObligations.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../ReleaseRepairObligations.fixtures";
import { inputSchema, type Input } from "../ReleaseRepairObligations.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(ReleaseRepairObligations, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}

const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.artifact.label,
    input.recipientLabel,
    input.labels.limitations,
    input.labels.register,
    input.labels.resolved,
    input.labels.example,
    ...input.issues
      .filter((issue) => issue.state === "open" || input.showResolvedIssues)
      .map(prop("label")),
    ...(frame >= 91 ? [input.labels.open] : []),
    ...(frame >= 103
      ? [
          input.issues.some(
            (issue) =>
              issue.state === "open" && issue.releaseRole === "blocking",
          )
            ? input.labels.held
            : input.labels.ready,
        ]
      : []),
    ...(frame >= 90
      ? input.issues
          .filter(
            (issue) =>
              issue.state === "open" && issue.releaseRole === "follow-up",
          )
          .flatMap((issue) => [issue.label, issue.owner, issue.dueLabel])
      : []),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "expertId",
  "focusedContributionId",
  "demonstration",
  "tableArrangement",
  "artifact",
  "kind",
  "form",
  "state",
  "gesture",
  "retest",
  "releaseRole",
  "issueMarks",
];

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: releaseRepairObligationsContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
export { _render, render, _getVisibleTexts, EXCLUDED_TEXT_FIELDS, options };
