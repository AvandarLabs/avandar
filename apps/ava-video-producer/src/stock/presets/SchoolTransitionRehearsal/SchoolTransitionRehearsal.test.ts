/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SchoolTransitionRehearsal } from "./SchoolTransitionRehearsal";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "./SchoolTransitionRehearsal.fixtures";
import { inputSchema, type Input } from "./SchoolTransitionRehearsal.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(SchoolTransitionRehearsal, {
        frame,
        input,
        accent: "#67e8c2",
        id: "packet20",
      }),
    ),
  );
}

test("learner opens the locker before approaching the classroom with chosen support", () => {
  const setup = _render({ frame: 20 });
  const locker = _render({ frame: 65 });
  const hold = _render({ frame: 150 });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: setup,
        marker: "learner",
      }),
      name: "cx",
    }),
    200,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: locker,
        marker: "learner",
      }),
      name: "cx",
    }),
    390,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: locker,
        marker: "locker-door",
      }),
      name: "width",
    }) < 20,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup: hold, marker: "learner" }),
      name: "cx",
    }),
    730,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "companion",
      }),
      name: "cx",
    }),
    510,
  );
  assert.match(hold, /aria-label="Practice visit"/);
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { schoolTransitionRehearsalContract as contract } from "./SchoolTransitionRehearsal.contract";

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

function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.people),
    ...Object.values(input.labels),
    ...input.stops.map(prop("label")),
    ...(input.showPracticeStrip ? input.stops.map(prop("actionLabel")) : []),
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
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "kind", "finalStepSupport"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input: input, frame: frame }).map(_escape);
  },
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("both support choices preserve rehearsal people and stop identity with either optional trace", () => {
  (["alongside", "stands-back"] as const).forEach((finalStepSupport) => {
    return [true, false].forEach((showPracticeStrip) => {
      return [true, false].forEach((showFootprints) => {
        const input = {
          ...defaultInput,
          finalStepSupport,
          showPracticeStrip,
          showFootprints,
          labels: {
            ...defaultInput.labels,
            choice: "Authored choice, preserved literally".slice(0, 34),
          },
        };
        const hold = _render({ frame: 150, input: input });
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: SvgAttributes.fromMarker({
              markup: hold,
              marker: "companion",
            }),
            name: "cx",
          }),
          finalStepSupport === "alongside" ? 625 : 510,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: SvgAttributes.fromMarker({
              markup: hold,
              marker: "learner",
            }),
            name: "cx",
          }),
          730,
        );
        assert.equal(
          hold.includes('data-practice-strip=""'),
          showPracticeStrip,
        );
        assert.ok(hold.includes(`aria-label="${input.labels.choice}"`));
        assert.match(hold, /Practice visit/);
        assert.doesNotMatch(hold, /enrolled|attendance|attended|independent/);
        [54, 58, 62, 65].forEach((frame) => {
          const markup = _render({ frame: frame, input: input });
          const hand = SvgAttributes.fromMarker({
            markup,
            marker: "locker-hand",
          });
          const handle = SvgAttributes.fromMarker({
            markup,
            marker: "locker-handle",
          });
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }),
            SvgAttributes.getNumberFromMarkup({
              attributes: handle,
              name: "cx",
            }),
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
            SvgAttributes.getNumberFromMarkup({
              attributes: handle,
              name: "cy",
            }),
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: SvgAttributes.fromMarker({
                markup,
                marker: "learner",
              }),
              name: "cx",
            }),
            390,
          );
        });
      });
    });
  });
});
