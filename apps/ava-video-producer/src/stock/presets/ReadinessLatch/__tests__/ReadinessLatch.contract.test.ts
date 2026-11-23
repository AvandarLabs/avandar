import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { readinessLatchContract } from "../ReadinessLatch.contract";
import { DEFAULT_INPUT, fixtures } from "../ReadinessLatch.fixtures";
import { inputSchema, type Input } from "../ReadinessLatch.schema";
import { assertFullLabeledResultStaysOrientation as _assertFullLabeledResultStaysOrientation } from "./assertFullLabeledResultStaysOrientation";
import { assertWorkQuantitiesCompleteOutInput as _assertWorkQuantitiesCompleteOutInput } from "./assertWorkQuantitiesCompleteOutInput";
import {
  _render,
  _getVisibleTextsFromInput,
  _getAttributesFromMarkup,
  _getResultBoundsFromMarkup,
} from "./ReadinessLatchTestHelpers";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: readinessLatchContract,
  render: ({ frame, input }) => {
    return `${_render({ frame, input })}${_render({
      frame,
      input: {
        ...input,
        orientation:
          input.orientation === "horizontal" ? "vertical" : "horizontal",
      },
    })}`;
  },
  excludedTextFields: ["id", "orientation"],
  getVisibleTexts: _getVisibleTextsFromInput,
  textFrames: [24, 80, 150],
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: 1 },
    { ...DEFAULT_INPUT, participants: [] },
    {
      ...DEFAULT_INPUT,
      participants: [
        DEFAULT_INPUT.participants[0],
        DEFAULT_INPUT.participants[0],
      ],
    },
    {
      ...DEFAULT_INPUT,
      participants: DEFAULT_INPUT.participants.map((participant) => {
        return { ...participant, workUnits: 0 };
      }),
    },
    {
      ...DEFAULT_INPUT,
      participants: [
        { ...DEFAULT_INPUT.participants[0], unknown: true },
        DEFAULT_INPUT.participants[1],
      ],
    },
  ],
});

test("a required unready dependency keeps its pin and blocks the result", () => {
  const input = fixtures[3].input;
  const markup = _render({ frame: 150, input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getAttributesFromMarkup({
        markup,
        id: "missing",
        kind: "pin",
      }),
      name: "y2",
    }),
    400,
  );
  const result = _getResultBoundsFromMarkup(markup);
  assert.ok(result.bottom < 400);
  const before = _getAttributesFromMarkup({
    markup,
    id: "before",
    kind: "gate",
  });
  const after = _getAttributesFromMarkup({ markup, id: "after", kind: "gate" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "x2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "x1" }),
  );
});

test("work quantities complete out of array order before the common release at 122", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    participants: [
      { id: "slow", label: "Slow", ready: true, workUnits: 5 },
      { id: "fast", label: "Fast", ready: true, workUnits: 1 },
    ],
  };
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getAttributesFromMarkup({
        markup: _render({ frame: 50, input }),
        id: "fast",
        kind: "pin",
      }),
      name: "x1",
    }),
    692,
  );
  _assertWorkQuantitiesCompleteOutInput(input);
  assert.ok(
    _getResultBoundsFromMarkup(_render({ frame: 146, input })).left > 650,
  );
});

test("dense branch geometry stays on canvas through each orientation and completion", () => {
  (["horizontal", "vertical"] as const).forEach((orientation) => {
    const input = { ...fixtures[2].input, orientation };
    [12, 14, 16, 18, 20, 24, 42, 60, 77, 95, 112, 122, 146, 166].forEach(
      (frame) => {
        const markup = _render({ frame, input });
        input.participants.forEach(({ id }) => {
          const pin = _getAttributesFromMarkup({ markup, id, kind: "pin" });
          ["x1", "x2"].forEach((attribute) => {
            return assert.ok(
              SvgAttributes.getNumberFromMarkup({
                attributes: pin,
                name: attribute,
              }) >= 0 &&
                SvgAttributes.getNumberFromMarkup({
                  attributes: pin,
                  name: attribute,
                }) <= 960,
            );
          });
          ["y1", "y2"].forEach((attribute) => {
            return assert.ok(
              SvgAttributes.getNumberFromMarkup({
                attributes: pin,
                name: attribute,
              }) >= 0 &&
                SvgAttributes.getNumberFromMarkup({
                  attributes: pin,
                  name: attribute,
                }) <= 600,
            );
          });
        });
      },
    );
  });
});

test("readiness label, state and work-value toggles preserve the same gate result", () => {
  const input = { ...DEFAULT_INPUT, showWorkValues: true };
  const noStates = _render({
    frame: 150,
    input: { ...input, showParticipantStates: false },
  });
  assert.ok(!noStates.includes(`aria-label="${input.copy.ready}"`));
  assert.ok(noStates.includes(`aria-label="${input.unitLabel}"`));
  const noWork = _render({
    frame: 150,
    input: { ...input, showWorkValues: false },
  });
  assert.ok(!noWork.includes(`aria-label="${input.unitLabel}"`));
  assert.ok(noWork.includes(`aria-label="${input.copy.ready}"`));
  const noLabels = _render({
    frame: 150,
    input: { ...input, showLabels: false },
  });
  assert.doesNotMatch(noLabels, /aria-label=/);
  assert.ok(_getResultBoundsFromMarkup(noLabels).left > 650);
});

test("completed work ribbons physically reach the shared latch in both orientations", () => {
  (["horizontal", "vertical"] as const).forEach((orientation) => {
    const input = { ...DEFAULT_INPUT, orientation };
    const markup = _render({ frame: 120, input });
    input.participants.forEach(({ id }) => {
      const ribbon = _getAttributesFromMarkup({ markup, id, kind: "ribbon" });
      if (orientation === "horizontal") {
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: ribbon, name: "x" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: ribbon,
              name: "width",
            }),
          650,
        );
      } else {
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: ribbon, name: "y" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: ribbon,
              name: "height",
            }),
          400,
        );
      }
    });
  });
});

test("the full labeled result stays upstream until a visible opening clears its path", () => {
  (["horizontal", "vertical"] as const).forEach((orientation) => {
    return _assertFullLabeledResultStaysOrientation(orientation);
  });
});
