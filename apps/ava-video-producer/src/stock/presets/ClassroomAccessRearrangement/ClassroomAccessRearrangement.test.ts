import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { ClassroomAccessRearrangement } from "./ClassroomAccessRearrangement";
import { classroomAccessRearrangementContract as contract } from "./ClassroomAccessRearrangement.contract";
import {
  DEFAULT_INPUT,
  minimumInput,
  denseInput,
  changedInput,
  fixtures,
  invalidInputs,
} from "./ClassroomAccessRearrangement.fixtures";
import { inputSchema, type Input } from "./ClassroomAccessRearrangement.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ClassroomAccessRearrangement, {
        frame,
        input,
        accent: "#79d5bd",
        background: "#101720",
        id: "packet16",
      }),
    ),
  );
}
test("The same learners enter the common activity after furniture changes", () => {
  const setup = _render({ frame: 24, input: DEFAULT_INPUT });
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal([...hold.matchAll(/data-classroom-learner=/g)].length, 4);
  assert.notEqual(
    setup.match(/data-desks="[^"]+"/)?.[0],
    hold.match(/data-desks="[^"]+"/)?.[0],
  );
  DEFAULT_INPUT.learners.forEach(({ id }) =>
    assert.ok(hold.includes(`data-classroom-learner="${id}"`)),
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.activity.label,
    input.activity.boardText,
    frame < 72 ? input.phaseLabels.before : input.phaseLabels.after,
    input.caption,
    ...input.learners.map(prop("label")),
    ...input.adaptations.map(prop("label")),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "movementIcon", "kind", "resolvedLayout"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

function _positions(markup: string): number[][] {
  return [
    ...markup.matchAll(
      /data-classroom-learner="[^"]*" data-mobility="[^"]*" transform="translate\(([-\d.]+) ([-\d.]+)\)"/g,
    ),
  ].map((match) => [Number(match[1]), Number(match[2])]);
}
test("all mobility identities finish inside the same activity in both layouts", () => {
  (["shared-circle", "open-horseshoe"] as const).forEach((resolvedLayout) =>
    [true, false].forEach((showApproachTrace) => {
      const input = { ...denseInput, resolvedLayout, showApproachTrace };
      const markup = _render({ frame: 150, input: input });
      _positions(markup).forEach(([x, y]) =>
        assert.ok(
          x - 25 >= 155 && x + 18 <= 605 && y - 31 >= 240 && y + 25 <= 495,
        ),
      );
      input.learners.forEach((learner) =>
        assert.ok(
          markup.includes(
            `data-classroom-learner="${learner.id}" data-mobility="${learner.movementIcon}"`,
          ),
        ),
      );
      assert.equal(
        markup.includes('data-approach-trace="true"'),
        showApproachTrace,
      );
    }),
  );
  assert.notDeepEqual(
    _positions(_render({ frame: 150, input: denseInput })),
    _positions(
      _render({
        frame: 150,
        input: { ...denseInput, resolvedLayout: "open-horseshoe" },
      }),
    ),
  );
});
test("unselected surfaces remain unchanged while desks physically open", () => {
  const setup = _render({ frame: 24, input: changedInput }),
    hold = _render({ frame: 150, input: changedInput });
  assert.match(
    hold,
    /data-shared-table="false" transform="translate\(380 370\) rotate\(-12\)"/,
  );
  assert.match(
    setup,
    /data-shared-table="false" transform="translate\(380 370\) rotate\(-12\)"/,
  );
  assert.match(hold, /data-board-adaptation="false"/);
  const desks = (markup: string) =>
    [...markup.matchAll(/data-desk="\d" x="([-.\d]+)" y="([-.\d]+)"/g)].map(
      (match) => match.slice(1),
    );
  assert.notDeepEqual(desks(setup), desks(hold));
});
test("participant routes clear desks and retain separate full body and key envelopes", () => {
  (["shared-circle", "open-horseshoe"] as const).forEach((resolvedLayout) =>
    [
      denseInput,
      { ...denseInput, adaptations: minimumInput.adaptations },
    ].forEach((fixture) => {
      const input = { ...fixture, resolvedLayout };
      Array.from({ length: 217 }, (_, index) => index / 2).forEach((frame) => {
        const markup = _render({ frame: frame, input: input }),
          positions = _positions(markup);
        const desks = [
          ...markup.matchAll(
            /data-desk="\d" x="([-.\d]+)" y="([-.\d]+)" width="88" height="42"/g,
          ),
        ].map((match) => [Number(match[1]), Number(match[2])]);
        positions.forEach(([x, y], index) => {
          assert.ok(
            x - 26 >= 40 && x + 19 < 735 && y - 32 >= 100 && y + 26 < 500,
          );
          desks.forEach(([deskX, deskY]) =>
            assert.ok(
              x + 19 < deskX - 1 ||
                x - 26 > deskX + 89 ||
                y + 26 < deskY - 1 ||
                y - 32 > deskY + 43,
              `frame ${frame} learner ${index}: desk collision`,
            ),
          );
          positions
            .slice(index + 1)
            .forEach(([otherX, otherY]) =>
              assert.ok(
                Math.abs(x - otherX) >= 45 || Math.abs(y - otherY) >= 58,
                `frame ${frame} learners ${index}: envelopes merge`,
              ),
            );
        });
      });
    }),
  );
});
test("furniture and participant joins remain continuous at fractional frames", () => {
  (["shared-circle", "open-horseshoe"] as const).forEach((resolvedLayout) =>
    [36, 60, 72, 76, 80, 84, 88, 90, 96, 100, 104, 108].forEach((frame) => {
      const before = _positions(
        _render({
          frame: frame - 0.001,
          input: { ...denseInput, resolvedLayout },
        }),
      );
      _positions(
        _render({
          frame: frame + 0.001,
          input: { ...denseInput, resolvedLayout },
        }),
      ).forEach(([x, y], index) =>
        assert.ok(Math.hypot(x - before[index][0], y - before[index][1]) < 0.5),
      );
    }),
  );
});
/** Inputs for clearsTable. */
type ClearsTableOptions = {
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  angle: number;
};

function _clearsTable({
  x,
  y,
  left,
  right,
  top,
  bottom,
  angle,
}: Readonly<ClearsTableOptions>): boolean {
  const corners = [
    [x + left, y + top],
    [x + right, y + top],
    [x + right, y + bottom],
    [x + left, y + bottom],
  ];
  const cosine = Math.cos((angle * Math.PI) / 180),
    sine = Math.sin((angle * Math.PI) / 180);
  const table = [
    [-96, -36],
    [96, -36],
    [96, 36],
    [-96, 36],
  ].map(([horizontal, vertical]) => [
    380 + horizontal * cosine - vertical * sine,
    370 + horizontal * sine + vertical * cosine,
  ]);
  return [
    [1, 0],
    [0, 1],
    [cosine, sine],
    [-sine, cosine],
  ].some(([axisX, axisY]) => {
    const personProjection = corners.map(
        ([horizontal, vertical]) => horizontal * axisX + vertical * axisY,
      ),
      tableProjection = table.map(
        ([horizontal, vertical]) => horizontal * axisX + vertical * axisY,
      );
    return (
      Math.max(...personProjection) < Math.min(...tableProjection) ||
      Math.max(...tableProjection) < Math.min(...personProjection)
    );
  });
}
test("body strokes and identity keys clear the selected or unchanged shared table", () => {
  (["shared-circle", "open-horseshoe"] as const).forEach((resolvedLayout) =>
    [true, false].forEach((hasTable) => {
      const input = {
        ...denseInput,
        resolvedLayout,
        adaptations: hasTable
          ? denseInput.adaptations
          : minimumInput.adaptations,
      };
      Array.from({ length: 65 }, (_, index) => 76 + index / 2).forEach(
        (frame) =>
          _positions(_render({ frame: frame, input: input })).forEach(
            ([x, y], index) => {
              assert.ok(
                _clearsTable({
                  x,
                  y,
                  left: -16,
                  right: 19,
                  top: -22,
                  bottom: 26,
                  angle: hasTable ? 0 : -12,
                }),
                `${frame}: body ${index} crosses shared table`,
              );
              assert.ok(
                _clearsTable({
                  x,
                  y,
                  left: -25,
                  right: -17,
                  top: -31,
                  bottom: -15,
                  angle: hasTable ? 0 : -12,
                }),
                `${frame}: key ${index} crosses shared table`,
              );
            },
          ),
      );
    }),
  );
});
