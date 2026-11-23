import { ReferralReturnAcknowledgementTestState } from "./ReferralReturnAcknowledgementTestState";

const {
  render: _render,
  attributes: _attributes,
  ASSERTIONS,
} = ReferralReturnAcknowledgementTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { referralReturnAcknowledgementContract } from "../../ReferralReturnAcknowledgement.contract";
import {
  DEFAULT_INPUT,
  invalidInputs,
} from "../../ReferralReturnAcknowledgement.fixtures";
import { inputSchema } from "../../ReferralReturnAcknowledgement.schema";
import { assertPeopleCrossIndependentlyPhysicalAfterAfter as _assertPeopleCrossIndependentlyPhysicalAfterAfter } from "./assertPeopleCrossIndependentlyPhysicalAfterAfter";

test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
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
  _assertPeopleCrossIndependentlyPhysicalAfterAfter(after);
});

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
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(referralReturnAcknowledgementContract.semanticRules),
  ) as typeof referralReturnAcknowledgementContract.semanticRules;
  const paths = ["referrals.*.id"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique/i);
});

test("serialized contract exposes acknowledgement implication validation", () => {
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(referralReturnAcknowledgementContract.semanticRules),
  ) as typeof referralReturnAcknowledgementContract.semanticRules;
  const paths = ["referrals.*.acknowledged", "referrals.*.attended"];
  const rule = rules.find((candidate) => {
    return (
      candidate.paths.length === paths.length &&
      paths.every((path) => {
        return candidate.paths.includes(path);
      })
    );
  });
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /acknowledged=true requires attended=true/i);
});
