import { ReferralConsentWithdrawalTestState } from "./ReferralConsentWithdrawalTestState";

const {
  render: _render,
  EXCLUDED_TEXT_FIELDS,
  visible: _visible,
  escape: _escape,
  statusInput: _statusInput,
  assertStatuses: _assertStatuses,
} = ReferralConsentWithdrawalTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { referralConsentWithdrawalContract as contract } from "../../ReferralConsentWithdrawal.contract";
import {
  DEFAULT_INPUT,
  invalidInputs,
  fixtures,
} from "../../ReferralConsentWithdrawal.fixtures";
import { inputSchema } from "../../ReferralConsentWithdrawal.schema";
import { assertContactCaptionsFollowReferencedInput as _assertContactCaptionsFollowReferencedInput } from "./assertContactCaptionsFollowReferencedInput";
import { assertContactCaptionsFollowReferencedInputFrame as _assertContactCaptionsFollowReferencedInputFrame } from "./assertContactCaptionsFollowReferencedInputFrame";
import { assertTurningHandWorkerTouchFrame as _assertTurningHandWorkerTouchFrame } from "./assertTurningHandWorkerTouchFrame";

test("withdrawal holds affected preparations and retains earlier receipts", () => {
  const setup = _render({ frame: 20 });
  const hold = _render({ frame: 150 });
  assert.match(setup, /data-contact="call1"[^>]*data-state="prepared"/);
  assert.match(hold, /data-contact="call1"[^>]*data-state="held"/);
  assert.match(hold, /data-contact="call2"[^>]*data-state="prepared"/);
  assert.match(setup, /data-record="past"/);
  assert.match(hold, /data-record="past"/);
  assert.doesNotMatch(hold, /data-state="completed"/);
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input: input, frame: frame }).map(_escape);
  },
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("all-blocked preparations omit nonexistent ready and history beats", () => {
  const input = {
    ...fixtures[2].input,
    permissions: fixtures[2].input.permissions.map((permission) => {
      return { ...permission, withdrawn: true };
    }),
    priorRecords: [],
    showPurpose: false,
  };
  const hold = _render({ frame: 150, input: input });
  assert.equal((hold.match(/data-state="held"/g) || []).length, 3);
  assert.doesNotMatch(hold, /data-history=|data-state="prepared"/);
  input.permissions.forEach((permission) => {
    return assert.ok(!hold.includes(`aria-label="${permission.purpose}"`));
  });
});

test("the turning hand and the worker touch their actual moving objects", () => {
  [36, 38, 40, 42].forEach((frame) => {
    const markup = _render({ frame: frame });
    const slip = SvgAttributes.fromMarker({ markup, marker: "slip" });
    assert.ok(
      markup.indexOf("data-participant-hand=") < markup.indexOf("data-slip="),
      "hand cannot paint over permission text",
    );
    const right =
      SvgAttributes.getNumberFromMarkup({ attributes: slip, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: slip, name: "width" });
    const hand = SvgAttributes.fromMarker({
      markup,
      marker: "participant-hand",
    });
    assert.ok(hand.includes(`L${right} 235`));
  });
  [60, 64, 68, 72, 76].forEach((frame) => {
    return _assertTurningHandWorkerTouchFrame(frame);
  });
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 20 }),
      marker: "contact-card",
    }),
    SvgAttributes.fromMarker({
      markup: _render({ frame: 150 }),
      marker: "contact-card",
    }),
  );
  const history = (frame: number) => {
    return _render({ frame: frame }).split('data-history="retained"')[1];
  };
  assert.equal(history(20), history(150));
});

test("contact captions follow referenced permission turns despite reordered and repeated contacts", () => {
  const input = _statusInput(false);
  _assertContactCaptionsFollowReferencedInputFrame(input);
  Array.from(
    { length: Math.max(0, Math.floor((60 - 36) / 1) + 1) },
    (_, sampleIndex) => {
      return 36 + sampleIndex * 1;
    },
  ).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const statuses = input.plannedContacts.map((contact) => {
      const slip = markup
        .split(`data-permission="${contact.permissionId}"`)[1]
        .split('data-permission="')[0]
        .split('data-contact="')[0];
      return slip.includes('aria-label="Recalled"') ? "Recalled" : "Granted";
    });
    _assertStatuses({ input, frame, statuses });
  });
  _assertStatuses({
    input,
    frame: 76,
    statuses: ["On hold", "Recalled", "Recalled"],
  });
  _assertStatuses({
    input,
    frame: 92,
    statuses: ["On hold", "On hold", "Recalled"],
  });
  _assertContactCaptionsFollowReferencedInput(input);
});
