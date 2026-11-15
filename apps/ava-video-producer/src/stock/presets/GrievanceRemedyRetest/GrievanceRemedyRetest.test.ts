/** Behavioral scene, input, identity and geometry assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GrievanceRemedyRetest } from "./GrievanceRemedyRetest";
import {
  DEFAULT_INPUT,
  INVALID_INPUTS,
  fixtures,
} from "./GrievanceRemedyRetest.fixtures";
import { inputSchema, type Input } from "./GrievanceRemedyRetest.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(GrievanceRemedyRetest, {
      frame,
      input,
      accent: "#67e8c2",
      id: "test",
    }),
  );
}

test("the participant tests the repair before a separate accepted response closes it", () => {
  assert.match(_render({ frame: 20 }), /data-object-state="not-functioning"/);
  assert.match(_render({ frame: 80 }), /data-complaint-state="open"/);
  assert.match(
    _render({ frame: 104 }),
    /data-operation="retest"[^>]*data-actor="participant"/,
  );
  assert.match(_render({ frame: 150 }), /data-complaint-state="closed"/);
  assert.match(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, participantResponse: "not-accepted" },
    }),
    /data-complaint-state="open"/,
  );
  assert.doesNotMatch(
    _render({
      frame: 104,
      input: {
        ...DEFAULT_INPUT,
        testResults: { before: "not-functioning", after: "not-tested" },
        participantResponse: "pending",
      },
    }),
    /data-operation="retest"/,
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { grievanceRemedyRetestContract as contract } from "./GrievanceRemedyRetest.contract";

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
    input.object.label,
    input.labels.issue,
    ...(frame >= 78 ? [input.labels.repair] : []),
    ...(frame >= 88 && input.testResults.after !== "not-tested"
      ? [input.labels.test]
      : []),
    frame < 120
      ? input.labels.pending
      : input.participantResponse === "accepted"
        ? input.labels.accepted
        : input.participantResponse === "not-accepted"
          ? input.labels.notAccepted
          : input.labels.pending,
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
  invalidInputs: INVALID_INPUTS,
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

test("repair and participant acceptance are independent for both concrete objects", () => {
  (["locker-latch", "desk-lamp"] as const).forEach((kind) => {
    (["functioning", "not-functioning", "not-tested"] as const).forEach(
      (after) => {
        (["accepted", "not-accepted", "pending"] as const).forEach(
          (participantResponse) => {
            const input = {
              ...DEFAULT_INPUT,
              object: { kind, label: "Object" },
              testResults: { before: "not-functioning" as const, after },
              participantResponse,
              showComplaintMarker: false,
            };
            if (participantResponse === "accepted" && after !== "functioning") {
              assert.equal(inputSchema.safeParse(input).success, false);
              return;
            }
            const hold = _render({ frame: 150, input: input });
            assert.ok(hold.includes(`data-object-state="${after}"`));
            assert.ok(
              hold.includes(
                `data-complaint-state="${participantResponse === "accepted" ? "closed" : "open"}"`,
              ),
            );
            assert.doesNotMatch(hold, /data-complaint-marker=/);
            const operation = _render({ frame: 104, input: input });
            if (after === "not-tested") {
              assert.doesNotMatch(operation, /data-operation="retest"/);
            } else {
              assert.ok(
                SvgAttributes.fromMarker({
                  markup: operation,
                  marker: "operation",
                }).includes("L560 330"),
              );
            }
          },
        );
      },
    );
  });
});
test("the repair hand follows the replacement part and the participant places the complaint", () => {
  [56, 67, 78].forEach((frame) => {
    const markup = _render({ frame: frame });
    const part = SvgAttributes.fromMarker({
      markup,
      marker: "replacement-part",
    });
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: part,
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: part, name: "y" });
    assert.ok(
      SvgAttributes.fromMarker({ markup, marker: "repair-hand" }).includes(
        `L${x + 12} ${y + 9}`,
      ),
    );
  });
  [32, 37, 42].forEach((frame) => {
    const markup = _render({ frame: frame });
    const marker = SvgAttributes.fromMarker({
      markup,
      marker: "complaint-marker",
    });
    assert.ok(
      SvgAttributes.fromMarker({ markup, marker: "complaint-hand" }).includes(
        `L${SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "cx" })} ${SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "cy" })}`,
      ),
    );
  });
});
