import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VaccinationSessionBalance } from "../../VaccinationSessionBalance";
import {
  DEFAULT_INPUT,
  fixtures,
} from "../../VaccinationSessionBalance.fixtures";
import {
  inputSchema,
  type Input,
} from "../../VaccinationSessionBalance.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>) {
  return renderToStaticMarkup(
    createElement(VaccinationSessionBalance, {
      frame,
      input,
      accent: "#65d6ad",
      id: "semantic",
    }),
  );
}

const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id", "recipientId", "outcome"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => {
    return [
      input.sceneLabel,
      input.copy.opening,
      input.copy.administered,
      input.copy.remaining,
      input.copy.discarded,
      ...input.recipients.map(prop("label")),
      ...(input.showEquation ? [input.copy.unit] : []),
      ...(input.showPeopleTotal ? [input.copy.people] : []),
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

/** Inputs consumed by the corresponding rendered assertions. */

type TextBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function _getRecipientLabelBounds(markup: string): TextBox[] {
  return Array.from(
    markup.matchAll(/<text aria-label="界{18}"([^>]*)>(.*?)<\/text>/g),
  ).flatMap(([, attributes, contents]) => {
    const size = Number(attributes.match(/font-size="([^"]+)"/)?.[1]);
    let baseline = Number(attributes.match(/ y="([^"]+)"/)?.[1]);
    assert.equal(size, 12);
    const lines = Array.from(
      contents.matchAll(/<tspan([^>]*)>(.*?)<\/tspan>/g),
    );
    assert.equal(
      lines
        .map(([, , text]) => {
          return text;
        })
        .join(""),
      "界".repeat(18),
    );
    return lines.map(([, span, text]) => {
      baseline += Number(span.match(/dy="([^"]+)"/)?.[1]);
      const left = Number(span.match(/x="([^"]+)"/)?.[1]);
      return {
        left,
        right: left + Array.from(text).length * size * 1.25,
        top: baseline - size,
        bottom: baseline + size * 0.3,
      };
    });
  });
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const VaccinationSessionBalanceTestState = {
  render: _render,
  textLayoutOptions,
  getRecipientLabelBounds: _getRecipientLabelBounds,
};
