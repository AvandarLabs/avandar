import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferralReturnAcknowledgement } from "../../ReferralReturnAcknowledgement";
import { referralReturnAcknowledgementContract } from "../../ReferralReturnAcknowledgement.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ReferralReturnAcknowledgement.fixtures";
import {
  inputSchema,
  type Input,
} from "../../ReferralReturnAcknowledgement.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ReferralReturnAcknowledgement, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
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

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const states = input.referrals.map((referral, index) => {
    return referral.acknowledged && frame >= 105 + index * 2
      ? input.copy.closed
      : referral.attended && frame >= 77 + index * 2
        ? input.copy.attendedOpen
        : input.copy.waiting;
  });
  return [
    input.sceneLabel,
    ...Object.values(input.services),
    ...input.referrals.map(prop("personLabel")),
    ...states,
    ...(input.showLedger
      ? [input.copy.referrals, input.copy.attendance, input.copy.returned]
      : []),
  ];
}

const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: referralReturnAcknowledgementContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ReferralReturnAcknowledgementTestState = {
  render: _render,
  attributes: _attributes,
  ASSERTIONS,
};
