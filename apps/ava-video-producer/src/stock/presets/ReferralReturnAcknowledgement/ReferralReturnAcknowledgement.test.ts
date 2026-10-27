import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ReferralReturnAcknowledgement } from "./ReferralReturnAcknowledgement";
import { referralReturnAcknowledgementContract } from "./ReferralReturnAcknowledgement.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
  invalidInputs,
} from "./ReferralReturnAcknowledgement.fixtures";
import {
  inputSchema,
  type Input,
} from "./ReferralReturnAcknowledgement.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
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
  const element = markup
    .match(/<[^>]+>/g)
    ?.find((tag) => tag.includes(`${attribute}="${value}"`));
  assert.ok(element, `${attribute}=${value}`);
  return element;
}
test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});
test("people cross independently from the physical acknowledgement that returns", () => {
  const before = _render({ frame: 30, input: DEFAULT_INPUT });
  const after = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: before,
        attribute: "data-person-id",
        value: "r1",
      }),
      name: "data-x",
    }),
    180,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: after,
        attribute: "data-person-id",
        value: "r1",
      }),
      name: "data-x",
    }),
    650,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: after,
        attribute: "data-person-id",
        value: "r2",
      }),
      name: "data-x",
    }),
    650,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: after,
        attribute: "data-person-id",
        value: "r3",
      }),
      name: "data-x",
    }),
    180,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: after,
        attribute: "data-return-id",
        value: "r1",
      }),
      name: "x",
    }),
    228,
  );
  assert.ok(!after.includes('data-return-id="r2"'));
  assert.ok(!after.includes('data-return-id="r3"'));
  assert.ok(
    !_render({ frame: 150, input: changedInput }).includes("data-return-id="),
  );
  ["person-journey", "return-message"].forEach((emphasis) => {
    const output = _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        emphasis: emphasis as Input["emphasis"],
        showLedger: false,
      },
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: _attributes({
          markup: output,
          attribute: "data-person-id",
          value: "r2",
        }),
        name: "data-x",
      }),
      650,
    );
    assert.ok(!output.includes('data-return-id="r2"'));
  });
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const states = input.referrals.map((referral, index) =>
    referral.acknowledged && frame >= 105 + index * 2
      ? input.copy.closed
      : referral.attended && frame >= 77 + index * 2
        ? input.copy.attendedOpen
        : input.copy.waiting,
  );
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
registerStockPresetAssertions(ASSERTIONS);
registerStockTextLayoutAssertions(ASSERTIONS);

test("the ledger separates exclusive states from overlapping attendance fractions", () => {
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  ["waiting", "attendedOpen", "closed"].forEach((state) => {
    const row = _attributes({
      markup,
      attribute: "data-referral-category",
      value: state,
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: row,
        name: "data-quantity",
      }),
      1,
    );
  });
  assert.match(markup, /transform="translate\(650 162\) scale\(/);
  const returned = _attributes({
    markup,
    attribute: "data-return-id",
    value: "r1",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: returned, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: returned,
        name: "width",
      }) <
      325,
  );
});

test("serialized contract exposes referral identity validation", () => {
  const rules = JSON.parse(
    JSON.stringify(referralReturnAcknowledgementContract.semanticRules),
  ) as typeof referralReturnAcknowledgementContract.semanticRules;
  const paths = ["referrals.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique/i);
});

test("serialized contract exposes acknowledgement implication validation", () => {
  const rules = JSON.parse(
    JSON.stringify(referralReturnAcknowledgementContract.semanticRules),
  ) as typeof referralReturnAcknowledgementContract.semanticRules;
  const paths = ["referrals.*.acknowledged", "referrals.*.attended"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /acknowledged=true requires attended=true/i);
});
