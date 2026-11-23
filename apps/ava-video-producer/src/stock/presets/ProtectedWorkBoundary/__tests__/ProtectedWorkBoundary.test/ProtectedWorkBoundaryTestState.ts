import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProtectedWorkBoundary } from "../../ProtectedWorkBoundary";
import { DEFAULT_INPUT, fixtures } from "../../ProtectedWorkBoundary.fixtures";
import { inputSchema, type Input } from "../../ProtectedWorkBoundary.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(ProtectedWorkBoundary, {
      frame,
      input,
      accent: "#65d6ad",
      id: "packet22",
    }),
  );
}

const options = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: [
    "id",
    "kind",
    "requestedSlotId",
    "placement",
    "agreedSlotId",
    "protectedPattern",
  ],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => {
    return [
      input.workerLabel,
      input.request.label,
      input.labels.unit,
      input.labels.example,
      input.labels.protected,
      input.request.placement === "defer"
        ? input.labels.deferred
        : input.labels.rescheduled,
      ...input.slots.flatMap((slot) => {
        return [
          input.labels[slot.kind],
          ...(input.showSlotLabels ? [slot.label] : []),
          ...(slot.workLabel === null ? [] : [slot.workLabel]),
        ];
      }),
    ];
  },
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ProtectedWorkBoundaryTestState = { render: _render, options };
