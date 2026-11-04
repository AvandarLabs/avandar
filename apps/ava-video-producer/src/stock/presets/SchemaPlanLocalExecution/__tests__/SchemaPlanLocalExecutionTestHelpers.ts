import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { SchemaPlanLocalExecution } from "../SchemaPlanLocalExecution";
import { schemaPlanLocalExecutionContract } from "../SchemaPlanLocalExecution.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../SchemaPlanLocalExecution.fixtures";
import { inputSchema, type Input } from "../SchemaPlanLocalExecution.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(SchemaPlanLocalExecution, {
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
    input.columns.category,
    input.columns.measure,
    input.request.question,
    input.request.planLabel,
    input.boundaryLabels.local,
    input.boundaryLabels.remote,
    ...(frame >= 55 ? [input.boundaryLabels.outbound] : []),
    ...(frame >= 56 ? [input.boundaryLabels.inbound] : []),
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    ...(frame >= 139 ? [input.boundaryLabels.result] : []),
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
  contract: schemaPlanLocalExecutionContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;

type TextBounds = { left: number; top: number; right: number; bottom: number };

function _getTextLineBounds({
  markup,
  x = 0,
  y = 0,
}: {
  markup: string;
  x?: number;
  y?: number;
}): TextBounds[] {
  return [...markup.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)].flatMap(
    ([text]) => {
      const size = SvgAttributes.getNumberFromMarkup({
        attributes: text,
        name: "font-size",
      });
      let baseline =
        y + SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" });
      return [...text.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)].map(
        ([, attributes, line]) => {
          baseline += SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "dy",
          });
          const left =
            x + SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
          return {
            left,
            top: baseline - size,
            right:
              left +
              getConservativeWidthFromText({ text: line, fontSize: size }),
            bottom: baseline + size * 0.3,
          };
        },
      );
    },
  );
}

function _getCardBounds({
  markup,
  kind,
}: {
  markup: string;
  kind: "inbound" | "outbound";
}) {
  const group = markup.match(
    new RegExp(`<g data-${kind}="true"[^>]*>([\\s\\S]*?)<\\/g>`),
  );
  assert.ok(group);
  const position = group[0].match(/translate\(([^ ]+) ([^)]+)\)/);
  const card = group[1].match(/<rect[^>]*>/)?.[0];
  assert.ok(position && card);
  const left = Number(position[1]),
    top = Number(position[2]);
  return {
    left,
    top,
    right:
      left +
      SvgAttributes.getNumberFromMarkup({ attributes: card, name: "width" }),
    bottom:
      top +
      SvgAttributes.getNumberFromMarkup({ attributes: card, name: "height" }),
    markup: group[1],
  };
}

function _assertSeparate({
  first,
  second,
  context,
}: {
  first: TextBounds;
  second: TextBounds;
  context: string;
}): void {
  assert.ok(
    first.right + 1 < second.left ||
      first.left - 1 > second.right ||
      first.bottom + 1 < second.top ||
      first.top - 1 > second.bottom,
    `${context}: ${JSON.stringify(first)} overlaps ${JSON.stringify(second)}`,
  );
}
export {
  _render,
  render,
  _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
  options,
  _getTextLineBounds,
  _getCardBounds,
  _assertSeparate,
};
export type { TextBounds };
