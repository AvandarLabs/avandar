import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferralConsentWithdrawal } from "../../ReferralConsentWithdrawal";
import { DEFAULT_INPUT } from "../../ReferralConsentWithdrawal.fixtures";
import { type Input } from "../../ReferralConsentWithdrawal.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(ReferralConsentWithdrawal, {
        frame,
        input,
        accent: "#67e8c2",
        id: "test",
      }),
    ),
  );
}

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
    ...input.permissions.flatMap((permission) => {
      return [
        permission.recipient,
        ...(input.showPurpose ? [permission.purpose] : []),
        permission.withdrawn &&
        frame >=
          40 +
            input.permissions.filter(prop("withdrawn")).indexOf(permission) * 8
          ? input.labels.withdrawn
          : input.labels.permitted,
      ];
    }),
    ...input.plannedContacts.flatMap((contact) => {
      return [contact.label];
    }),
    ...(input.priorRecords.length
      ? [
          input.labels.history,
          ...input.priorRecords.flatMap((record) => {
            return [record.recipient, record.dateLabel, record.summary];
          }),
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

function _statusInput(withReady: boolean): Input {
  return {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      permitted: "Granted",
      withdrawn: "Recalled",
      held: "On hold",
    },
    permissions: ["first", "second", "third"].map((id) => {
      return {
        id,
        recipient: id,
        purpose: "Contact",
        withdrawn: !withReady || id !== "third",
      };
    }),
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
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ReferralConsentWithdrawalTestState = {
  render: _render,
  EXCLUDED_TEXT_FIELDS,
  visible: _visible,
  escape: _escape,
  statusInput: _statusInput,
  assertStatuses: _assertStatuses,
};
