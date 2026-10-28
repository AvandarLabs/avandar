/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { InterpretedCaseDialogue } from "./InterpretedCaseDialogue";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "./InterpretedCaseDialogue.fixtures";
import { inputSchema, type Input } from "./InterpretedCaseDialogue.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(InterpretedCaseDialogue, {
      frame,
      input,
      accent: "#67e8c2",
      id: "packet20",
    }),
  );
}

test("supplied utterances appear participant then worker with original speaker attribution", () => {
  const first = _render({ frame: 55 });
  assert.match(first, /data-wording="original" data-speaker="participant"/);
  assert.match(first, /data-wording="interpreted" data-speaker="participant"/);
  assert.doesNotMatch(first, /data-wording="original" data-speaker="worker"/);
  const hold = _render({ frame: 150 });
  assert.equal([...hold.matchAll(/data-wording="/g)].length, 4);
  assert.match(hold, /data-wording="interpreted" data-speaker="worker"/);
  assert.match(hold, /aria-label="I prefer a morning meeting\."/);
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { interpretedCaseDialogueContract as contract } from "./InterpretedCaseDialogue.contract";

function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.example,
    ...Object.values(input.people),
    ...input.turns.flatMap((turn, index) => {
      const at = 24 + index * 56;
      return [
        ...(frame > at
          ? [
              input.labels.original,
              input.people[turn.speaker],
              input.languages[turn.speaker],
              turn.originalText,
            ]
          : []),
        ...(frame > at + 20
          ? [
              input.labels.interpreted,
              turn.interpretedText,
              turn.speaker === "participant"
                ? input.languages.worker
                : input.languages.participant,
            ]
          : []),
      ];
    }),
  ];
}
function _escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "speaker", "bubbleLayout"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("both layouts retain all supplied maximum CJK wordings without speaker substitution", () => {
  (["paired", "stacked"] as const).forEach((bubbleLayout) =>
    [true, false].forEach((showSightlines) => {
      const input = {
        ...fixtures[2].input,
        bubbleLayout,
        showSightlines,
        people: {
          participant: "原話者",
          worker: "担当者",
          interpreter: "通訳者",
        },
      };
      const markup = _render({ frame: 150, input: input });
      assert.equal(markup.includes('data-sightline=""'), showSightlines);
      const bubbles = [
        ...markup.matchAll(
          /<g data-wording="(original|interpreted)" data-speaker="(participant|worker)" data-turn="[^"]*"[^>]*>(.*?)<\/g>/g,
        ),
      ];
      assert.equal(bubbles.length, 4);
      bubbles.forEach(([, wording, speaker, content]) => {
        const turn = input.turns[speaker === "participant" ? 0 : 1];
        assert.ok(
          content.includes(
            `aria-label="${wording === "original" ? turn.originalText : turn.interpretedText}"`,
          ),
        );
        assert.ok(
          content.includes(
            `aria-label="${input.people[speaker as "participant" | "worker"]}"`,
          ),
        );
        assert.ok(!content.includes('aria-label="通訳者"'));
      });
      const rectangles = [
        ...markup.matchAll(/<rect data-bubble="[^"]*"[^>]*>/g),
      ].map(([r]) => ({
        x: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "x" }),
        y: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "y" }),
        w: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "width" }),
        h: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "height" }),
      }));
      rectangles.forEach((a, index) =>
        rectangles
          .slice(index + 1)
          .forEach((b) =>
            assert.ok(
              a.x + a.w <= b.x ||
                b.x + b.w <= a.x ||
                a.y + a.h <= b.y ||
                b.y + b.h <= a.y,
            ),
          ),
      );
    }),
  );
});
