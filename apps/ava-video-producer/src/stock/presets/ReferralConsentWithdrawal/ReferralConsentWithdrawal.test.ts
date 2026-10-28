/** Behavioral scene, input, identity and geometry assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferralConsentWithdrawal } from "./ReferralConsentWithdrawal";
import {
  DEFAULT_INPUT,
  invalidInputs,
  fixtures,
} from "./ReferralConsentWithdrawal.fixtures";
import { inputSchema, type Input } from "./ReferralConsentWithdrawal.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(ReferralConsentWithdrawal, {
      frame,
      input,
      accent: "#67e8c2",
      id: "test",
    }),
  );
}

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

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { referralConsentWithdrawalContract as contract } from "./ReferralConsentWithdrawal.contract";
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "permissionId",
  "projectId",
  "role",
  "kind",
  "before",
  "after",
  "participantResponse",
  "partition",
  "symbol",
  "tallyArrangement",
];
function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.example,
    ...Object.values(input.people),
    ...input.permissions.flatMap((permission) => [
      permission.recipient,
      ...(input.showPurpose ? [permission.purpose] : []),
      permission.withdrawn &&
      frame >=
        40 + input.permissions.filter(prop("withdrawn")).indexOf(permission) * 8
        ? input.labels.withdrawn
        : input.labels.permitted,
    ]),
    ...input.plannedContacts.flatMap((contact) => [contact.label]),
    ...(input.priorRecords.length
      ? [
          input.labels.history,
          ...input.priorRecords.flatMap((record) => [
            record.recipient,
            record.dateLabel,
            record.summary,
          ]),
        ]
      : []),
  ];
}
function _escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
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
    permissions: fixtures[2].input.permissions.map((permission) => ({
      ...permission,
      withdrawn: true,
    })),
    priorRecords: [],
    showPurpose: false,
  };
  const hold = _render({ frame: 150, input: input });
  assert.equal((hold.match(/data-state="held"/g) || []).length, 3);
  assert.doesNotMatch(hold, /data-history=|data-state="prepared"/);
  input.permissions.forEach((permission) =>
    assert.ok(!hold.includes(`aria-label="${permission.purpose}"`)),
  );
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
    const markup = _render({ frame: frame });
    const card = SvgAttributes.fromMarker({ markup, marker: "contact-card" });
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: card,
      name: "x",
    });
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: card,
      name: "y",
    });
    assert.ok(
      SvgAttributes.fromMarker({ markup, marker: "worker-hand" }).includes(
        `L${x + 350} ${y + 28}`,
      ),
    );
    assert.ok(y > 163, "card never touches the idle phone");
    assert.ok(x >= 520 && x + 350 <= 910);
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
  const history = (frame: number) =>
    _render({ frame: frame }).split('data-history="retained"')[1];
  assert.equal(history(20), history(150));
});

function _statusInput(withReady: boolean): Input {
  return {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      permitted: "Granted",
      withdrawn: "Recalled",
      held: "On hold",
    },
    permissions: ["first", "second", "third"].map((id) => ({
      id,
      recipient: id,
      purpose: "Contact",
      withdrawn: !withReady || id !== "third",
    })),
    plannedContacts: [
      {
        id: "late",
        permissionId: withReady ? "second" : "third",
        label: "Late preparation",
      },
      {
        id: "other",
        permissionId: withReady ? "third" : "first",
        label: "Other preparation",
      },
      {
        id: "repeat",
        permissionId: withReady ? "second" : "third",
        label: "Repeated preparation",
      },
    ],
  };
}
function _contactMarkup({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): string {
  return markup
    .split(`data-contact="${id}"`)[1]
    .split('data-contact="')[0]
    .split('data-history="')[0];
}
function _assertStatuses({
  input,
  frame,
  statuses,
}: {
  input: Input;
  frame: number;
  statuses: string[];
}): void {
  const markup = _render({ frame: frame, input: input });
  input.plannedContacts.forEach((contact, index) => {
    const card = _contactMarkup({ markup, id: contact.id });
    assert.ok(
      card.includes(`aria-label="${statuses[index]}"`),
      `${contact.id} at frame ${frame} must display ${statuses[index]}`,
    );
    assert.equal(
      card.includes('data-state="held"'),
      statuses[index] === "On hold",
    );
  });
  assert.equal(
    markup.split('data-history="retained"')[1],
    _render({ frame: 20, input: input }).split('data-history="retained"')[1],
  );
}
test("contact captions follow referenced permission turns despite reordered and repeated contacts", () => {
  const input = _statusInput(false);
  assert.ok(inputSchema.safeParse(input).success);
  [35, 36].forEach((frame) =>
    _assertStatuses({
      input,
      frame,
      statuses: ["Granted", "Granted", "Granted"],
    }),
  );
  [40, 44, 48, 52].forEach((frame) =>
    _assertStatuses({
      input,
      frame,
      statuses: ["Granted", "Recalled", "Granted"],
    }),
  );
  [56, 60, 70].forEach((frame) =>
    _assertStatuses({
      input,
      frame,
      statuses: ["Recalled", "Recalled", "Recalled"],
    }),
  );
  Array.from(
    { length: Math.max(0, Math.floor((60 - 36) / 1) + 1) },
    (_, sampleIndex) => 36 + sampleIndex * 1,
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
  _assertStatuses({
    input,
    frame: 108,
    statuses: ["On hold", "On hold", "On hold"],
  });
  const withReady = _statusInput(true);
  assert.ok(inputSchema.safeParse(withReady).success);
  [36, 40, 44].forEach((frame) =>
    _assertStatuses({
      input: withReady,
      frame,
      statuses: ["Granted", "Granted", "Granted"],
    }),
  );
  _assertStatuses({
    input: withReady,
    frame: 48,
    statuses: ["Recalled", "Granted", "Recalled"],
  });
  _assertStatuses({
    input: withReady,
    frame: 92,
    statuses: ["On hold", "Granted", "On hold"],
  });
});
