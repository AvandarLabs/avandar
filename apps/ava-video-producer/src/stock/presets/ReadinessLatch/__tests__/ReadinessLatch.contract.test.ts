import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { readinessLatchContract } from "../ReadinessLatch.contract";
import { DEFAULT_INPUT, fixtures } from "../ReadinessLatch.fixtures";
import { inputSchema, type Input } from "../ReadinessLatch.schema";
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
  render: ({ frame, input }) =>
    `${_render({ frame, input })}${_render({
      frame,
      input: {
        ...input,
        orientation:
          input.orientation === "horizontal" ? "vertical" : "horizontal",
      },
    })}`,
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
      participants: DEFAULT_INPUT.participants.map((participant) => ({
        ...participant,
        workUnits: 0,
      })),
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
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getAttributesFromMarkup({
        markup: _render({ frame: 50, input }),
        id: "slow",
        kind: "pin",
      }),
      name: "x1",
    }),
    640,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getAttributesFromMarkup({
        markup: _render({ frame: 112, input }),
        id: "slow",
        kind: "ribbon",
      }),
      name: "width",
    }),
    350,
  );
  assert.ok(
    _getResultBoundsFromMarkup(_render({ frame: 122, input })).right < 650,
  );
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
          ["x1", "x2"].forEach((attribute) =>
            assert.ok(
              SvgAttributes.getNumberFromMarkup({
                attributes: pin,
                name: attribute,
              }) >= 0 &&
                SvgAttributes.getNumberFromMarkup({
                  attributes: pin,
                  name: attribute,
                }) <= 960,
            ),
          );
          ["y1", "y2"].forEach((attribute) =>
            assert.ok(
              SvgAttributes.getNumberFromMarkup({
                attributes: pin,
                name: attribute,
              }) >= 0 &&
                SvgAttributes.getNumberFromMarkup({
                  attributes: pin,
                  name: attribute,
                }) <= 600,
            ),
          );
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
    const input = { ...DEFAULT_INPUT, orientation };
    [24, 112, 120, 122, 130].forEach((frame) => {
      const bounds = _getResultBoundsFromMarkup(_render({ frame, input }));
      assert.ok(
        orientation === "horizontal" ? bounds.right < 650 : bounds.bottom < 400,
      );
    });
    const released = _getResultBoundsFromMarkup(_render({ frame: 146, input }));
    assert.ok(
      orientation === "horizontal" ? released.left > 650 : released.top > 400,
    );
    const moving = _getResultBoundsFromMarkup(_render({ frame: 138, input }));
    assert.ok(
      orientation === "horizontal"
        ? moving.left < 650 && moving.right > 650
        : moving.top < 400 && moving.bottom > 400,
    );
    const markup = _render({ frame: 130, input });
    const before = _getAttributesFromMarkup({
      markup,
      id: "before",
      kind: "gate",
    });
    const after = _getAttributesFromMarkup({
      markup,
      id: "after",
      kind: "gate",
    });
    const clearFrom = SvgAttributes.getNumberFromMarkup({
      attributes: before,
      name: orientation === "horizontal" ? "y2" : "x2",
    });
    const clearTo = SvgAttributes.getNumberFromMarkup({
      attributes: after,
      name: orientation === "horizontal" ? "y1" : "x1",
    });
    assert.ok(
      orientation === "horizontal"
        ? clearFrom + 2.5 < moving.top && clearTo - 2.5 > moving.bottom
        : clearFrom + 2.5 < moving.left && clearTo - 2.5 > moving.right,
    );
    [36, 130, 138, 146].forEach((frame) => {
      const sample = _render({ frame, input });
      const bounds = _getResultBoundsFromMarkup(sample);
      const label = sample.match(
        new RegExp(`<text aria-label="${input.sharedAction}"[^>]*>`),
      );
      assert.ok(label);
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: label[0],
          name: "x",
        }) >= bounds.left,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "x" }) <
          bounds.right,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "y" }) >
          bounds.top,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "y" }) <
          bounds.bottom,
      );
    });
  });
});
