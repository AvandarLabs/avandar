/** Behavioral scene, input, identity and geometry assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivateCaseConversation } from "./PrivateCaseConversation";
import {
  DEFAULT_INPUT,
  INVALID_INPUTS,
  fixtures,
} from "./PrivateCaseConversation.fixtures";
import { inputSchema, type Input } from "./PrivateCaseConversation.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(PrivateCaseConversation, {
      frame,
      input,
      accent: "#67e8c2",
      id: "test",
    }),
  );
}

test("supporter exits before partition closure while both meeting seats remain", () => {
  const setup = _render({ frame: 20 });
  const exited = _render({ frame: 84 });
  const hold = _render({ frame: 150 });
  assert.match(setup, /data-person="s"[^>]*data-space="meeting"/);
  assert.match(exited, /data-person="s"[^>]*data-space="waiting"/);
  assert.match(exited, /data-partition="screen"[^>]*data-closed="false"/);
  assert.match(hold, /data-partition="screen"[^>]*data-closed="true"/);
  ["p", "w"].forEach((id) =>
    assert.match(
      hold,
      new RegExp(`data-person="${id}"[^>]*data-space="meeting"`),
    ),
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { privateCaseConversationContract as contract } from "./PrivateCaseConversation.contract";
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
    input.copy.example,
    input.requestLabel,
    input.roomLabels.meeting,
    input.copy.hold,
    ...input.people
      .filter(
        (person) =>
          person.role !== "supporter" ||
          input.showWaitingSupporter ||
          frame < 96,
      )
      .map(prop("label")),
    ...(input.showWaitingSupporter || frame < 96
      ? [input.roomLabels.waiting, input.copy.acknowledgement]
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

test("both partitions close behind the fully exited supporter with either inset choice", () => {
  (["door", "screen"] as const).forEach((partition) =>
    [true, false].forEach((showWaitingSupporter) => {
      const input = { ...DEFAULT_INPUT, partition, showWaitingSupporter };
      [20, 44, 64, 84, 86, 97, 108, 150].forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        assert.ok(
          markup.indexOf("data-partition=") < markup.indexOf("data-person="),
          "room strokes stay behind person labels",
        );
        const anchors = [
          ...markup.matchAll(/<circle data-person-anchor="([^"]*)"[^>]*>/g),
        ];
        anchors.forEach(([attributes, id]) => {
          const x = SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "cx",
          });
          const y = SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "cy",
          });
          if (id === "p" || id === "w") {
            assert.equal(x, id === "p" ? 220 : 460);
            assert.equal(y, 290);
          } else if (frame >= 84) {
            assert.equal(x, 780);
            assert.ok(x - 12 > 631);
          }
        });
        if (frame === 84) {
          assert.match(markup, /data-closed="false"/);
        }
        if (frame >= 108) {
          assert.match(markup, /data-closed="true"/);
        }
      });
      const hold = _render({ frame: 150, input: input });
      assert.match(hold, /data-person="s" data-space="waiting"/);
      assert.match(
        hold,
        new RegExp(
          `data-person="s"[^>]*opacity="${showWaitingSupporter ? 1 : 0}"`,
        ),
      );
    }),
  );
});
