import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ServiceablePanelSwap } from "../../ServiceablePanelSwap";
import { serviceablePanelSwapContract } from "../../ServiceablePanelSwap.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../../ServiceablePanelSwap.fixtures";
import { inputSchema, type Input } from "../../ServiceablePanelSwap.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(ServiceablePanelSwap, {
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
    input.workerLabel,
    ...input.modules.map(prop("label")),
    input.replacement.label,
    input.labels.whole,
    input.labels.retained,
    input.labels.example,
    ...(frame >= 117 ? [input.labels.changed, input.labels.removed] : []),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "pattern",
  "kind",
  "workpieceMaterial",
  "transferState",
  "enclosure",
  "targetModuleId",
  "source",
  "destination",
  "category",
  "measure",
  "question",
  "selectedCategory",
  "columnIds",
  "cachedColumnIds",
  "keyColumnId",
  "cells",
];

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs,
  contract: serviceablePanelSwapContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ServiceablePanelSwapTestState = { render, options };
