import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryColumnCacheGrowth } from "../../QueryColumnCacheGrowth";
import { queryColumnCacheGrowthContract } from "../../QueryColumnCacheGrowth.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../../QueryColumnCacheGrowth.fixtures";
import { inputSchema, type Input } from "../../QueryColumnCacheGrowth.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertLiteralCellsWrapWholeAttributesOptions = {
  attributes: RegExpExecArray[][number][1];
  body: RegExpExecArray[][number][2];
  index: number;
  expected: Readonly<Array<string | string[][number]>>;
};

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(QueryColumnCacheGrowth, {
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
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    ...input.requests.map(prop("label")),
    ...input.columns
      .filter(({ id }) => {
        return input.cachedColumnIds.includes(id) || frame >= 106;
      })
      .map(prop("label")),
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
  contract: queryColumnCacheGrowthContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const QueryColumnCacheGrowthTestState = { render, options };
