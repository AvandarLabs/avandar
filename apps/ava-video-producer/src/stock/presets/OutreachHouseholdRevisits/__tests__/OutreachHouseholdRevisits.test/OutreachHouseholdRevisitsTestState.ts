import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OutreachHouseholdRevisits } from "../../OutreachHouseholdRevisits";
import { outreachHouseholdRevisitsContract } from "../../OutreachHouseholdRevisits.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../OutreachHouseholdRevisits.fixtures";
import {
  inputSchema,
  type Input,
} from "../../OutreachHouseholdRevisits.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(
        "svg",
        {},
        createElement(OutreachHouseholdRevisits, {
          frame,
          input,
          accent: "#9fefca",
          id: "test",
        }),
      ),
    ),
  );
}

function _attributes({
  markup,
  attribute,
  value,
}: {
  markup: string;
  attribute: string;
  value: string;
}): string {
  const element = markup.match(/<[^>]+>/g)?.find((tag) => {
    return tag.includes(`${attribute}="${value}"`);
  });
  assert.ok(element, `${attribute}=${value}`);
  return element;
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.sceneLabel,
    ...input.households.map(prop("label")),
    input.copy.map,
    input.copy.contacted,
    input.copy.noContact,
    input.copy.unvisited,
    input.copy.denominator,
    ...(input.showUniqueLedger ? [input.copy.visits, input.copy.visited] : []),
  ];
}

const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: outreachHouseholdRevisitsContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const OutreachHouseholdRevisitsTestState = {
  render: _render,
  attributes: _attributes,
  ASSERTIONS,
};
