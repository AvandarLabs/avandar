import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderedLockAcquisition } from "../../OrderedLockAcquisition";
import { orderedLockAcquisitionContract } from "../../OrderedLockAcquisition.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  INVALID_INPUTS,
} from "../../OrderedLockAcquisition.fixtures";
import { inputSchema } from "../../OrderedLockAcquisition.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from "../../OrderedLockAcquisition.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(OrderedLockAcquisition, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    ...input.resources.map(prop("label")),
    ...input.operations.map(prop("label")),
  ];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs: INVALID_INPUTS,
  contract: orderedLockAcquisitionContract,
  render: _render,
  excludedTextFields: [
    "id",
    "entityId",
    "requestedIds",
    "firstOperationId",
    "outcome",
    "rule",
    "nullPolicy",
    "replacement",
    "originalRows",
    "rows",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const OrderedLockAcquisitionTestState = { render: _render, options };
