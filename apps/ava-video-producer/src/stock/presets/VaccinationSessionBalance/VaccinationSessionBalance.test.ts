/** Semantic rendering tests for vaccination-session-balance. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VaccinationSessionBalance } from "./VaccinationSessionBalance";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./VaccinationSessionBalance.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
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
test("Used, remaining and lost dose tokens sum exactly to starting units; people counts remain distinct from doses and no person appears for an unused dose. Reject administered units without a recipient ID and non-administered units with a recipient ID.", () => {
  const markup = _render({ frame: 150 });
  assert.equal(
    (markup.match(/data-dose=/g) ?? []).length,
    DEFAULT_INPUT.units.length,
  );
  assert.equal(
    (markup.match(/data-recipient=/g) ?? []).length,
    DEFAULT_INPUT.recipients.length,
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { vaccinationSessionBalanceContract } from "./VaccinationSessionBalance.contract";
import { inputSchema, type Input } from "./VaccinationSessionBalance.schema";
const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id", "recipientId", "outcome"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.sceneLabel,
    input.copy.opening,
    input.copy.administered,
    input.copy.remaining,
    input.copy.discarded,
    ...input.recipients.map(prop("label")),
    ...(input.showEquation ? [input.copy.unit] : []),
    ...(input.showPeopleTotal ? [input.copy.people] : []),
  ],
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;
registerStockPresetAssertions({
  ...textLayoutOptions,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: vaccinationSessionBalanceContract,
});
registerStockTextLayoutAssertions(textLayoutOptions);

test("tokens leave the carrier once, remain conserved and settle beside the exact recipient", () => {
  const input = fixtures[2].input;
  [24, 36, 58, 80, 108, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const tokens = Array.from(
      markup.matchAll(
        /<rect data-dose="([^"]*)"[^>]* x="([^"]*)" y="([^"]*)" width="11" height="16"/g,
      ),
    );
    assert.equal(tokens.length, input.units.length);
    assert.equal(new Set(tokens.map((match) => match[1])).size, 12);
    tokens.forEach((match) => {
      const x = Number(match[2]);
      const y = Number(match[3]);
      assert.ok(x >= 35 && x + 11 <= 930);
      assert.ok(y >= 180 && y + 16 <= 460);
      if (frame === 24) {
        assert.ok(x + 11 < 245);
      }
      if (frame >= 108) {
        assert.ok(x > 280 && x + 11 < 655);
      }
    });
  });
  const onePerson: Input = {
    ...input,
    recipients: [input.recipients[0]],
    units: input.units.map((unit) => ({
      ...unit,
      recipientId: input.recipients[0].id,
    })),
  };
  assert.equal(inputSchema.safeParse(onePerson).success, true);
  const markup = _render({ frame: 150, input: onePerson });
  assert.equal((markup.match(/data-recipient=/g) ?? []).length, 1);
  assert.match(markup, /data-people-total="1"/);
  assert.match(markup, /data-equation="12\+0\+0"/);
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[1].input }),
    /data-recipient=/,
  );
});

test("every final destination owns precisely its authored unit identities", () => {
  const markup = _render({ frame: 150 });
  DEFAULT_INPUT.units.forEach((unit) => {
    const token = Array.from(
      markup.matchAll(/<rect data-dose="([^"]*)"[^>]*>/g),
    ).find((match) => match[1] === unit.id)?.[0];
    assert.ok(token);
    assert.ok(token.includes(`data-outcome="${unit.outcome}"`));
    if (unit.recipientId !== null) {
      assert.ok(token.includes(`data-recipient-id="${unit.recipientId}"`));
    } else {
      assert.ok(!token.includes("data-recipient-id="));
    }
  });
});

type TextBox = { left: number; right: number; top: number; bottom: number };
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
    assert.equal(lines.map(([, , text]) => text).join(""), "界".repeat(18));
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

test("concentrated doses stay clear of complete recipient labels and neighboring rows", () => {
  [1, 6].forEach((numRecipients) => {
    const recipients = fixtures[2].input.recipients.slice(0, numRecipients);
    const input = inputSchema.parse({
      ...fixtures[2].input,
      recipients,
      units: Array.from({ length: 12 }, (_, index) => ({
        id: `dose${index}`,
        outcome: "administered",
        recipientId:
          recipients[
            index < 13 - numRecipients ? 0 : index - (12 - numRecipients)
          ].id,
      })),
    });
    [108, 150, 167].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const labels = _getRecipientLabelBounds(markup);
      assert.equal(labels.length, numRecipients * 2);
      const tokens = Array.from(
        markup.matchAll(
          /<rect data-dose="[^"]*"[^>]* x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"/g,
        ),
      );
      assert.equal(tokens.length, 12);
      tokens.forEach(([, x, y, width, height]) =>
        labels.forEach((label) => {
          assert.ok(
            Number(x) + Number(width) <= label.left ||
              Number(x) >= label.right ||
              Number(y) + Number(height) <= label.top ||
              Number(y) >= label.bottom,
            `dose [${x}, ${y}, ${width}, ${height}] intersects label ${JSON.stringify(label)}`,
          );
        }),
      );
    });
  });
});
