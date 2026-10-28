import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq, propNotEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { PersonLedSupportCalendar } from "./PersonLedSupportCalendar";
import { personLedSupportCalendarContract } from "./PersonLedSupportCalendar.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  changedInput,
} from "./PersonLedSupportCalendar.fixtures";
import { inputSchema, type Input } from "./PersonLedSupportCalendar.schema";
import { PlannerVisibilityAssertions } from "./PlannerVisibilityAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PersonLedSupportCalendar, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet18",
      }),
    ),
  );
}
test("the agreed support appointment remains one rendered booking", () => {
  assert.ok(_render({ frame: 150 }).includes('data-booking="visit"'));
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.people),
    ...input.days.map(prop("label")),
    ...input.timeBands.map(prop("label")),
    ...input.commitments.map(prop("label")),
    input.copy.goal,
    input.copy.example,
    ...(frame >= 132 ? [input.copy.agreement] : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "cellIds",
  "eventBinId",
  "firstSnapshot",
  "focusedLocationId",
  "measure",
  "role",
  "kind",
  "initialDayId",
  "initialBandId",
  "agreedDayId",
  "agreedBandId",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: personLedSupportCalendarContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
function _booking({ markup, id }: { markup: string; id: string }): string {
  const match = [
    ...markup.matchAll(/<rect data-booking="([^"]*)"[^>]+>/g),
  ].find((item) => item[1] === id);
  assert.ok(match);
  return match[0];
}
test("only the support booking changes cells; proposal ghosts never duplicate bookings", () => {
  const setup = _render({ frame: 36 }),
    hold = _render({ frame: 150 });
  assert.equal(
    _booking({ markup: setup, id: "care" }),
    _booking({ markup: hold, id: "care" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _booking({ markup: setup, id: "visit" }),
      name: "x",
    }),
    244,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _booking({ markup: hold, id: "visit" }),
      name: "x",
    }),
    514,
  );
  assert.equal((hold.match(/data-booking=/g) ?? []).length, 2);
  assert.equal((hold.match(/data-proposal-ghost=/g) ?? []).length, 1);
  assert.doesNotMatch(
    _render({ frame: 150, input: changedInput }),
    /data-proposal-ghost=/,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _booking({
        markup: _render({ frame: 150, input: changedInput }),
        id: "visit",
      }),
      name: "y",
    }),
    332,
  );
});
test("worker contact places the proposal; participant contact carries it to the agreed cell", () => {
  Array.from({ length: 97 }, (_, index) => 12 + index * 0.25).forEach(
    (frame) => {
      const markup = _render({ frame: frame }),
        booking = _booking({ markup, id: "visit" }),
        hand = SvgAttributes.fromMarker({ markup, marker: "worker-hand" });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: booking, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: booking,
            name: "width",
          }) /
            2,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: booking, name: "y" }),
      );
    },
  );
  [DEFAULT_INPUT, fixtures[2].input, changedInput].forEach((input) =>
    Array.from({ length: 193 }, (_, index) => 52 + index * 0.25).forEach(
      (frame) => {
        const markup = _render({ frame: frame, input: input }),
          support = input.commitments.find(propEq("kind", "support"))!;
        const booking = _booking({ markup, id: support.id }),
          hand = SvgAttributes.fromMarker({
            markup,
            marker: "participant-hand",
          });
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
          SvgAttributes.getNumberFromMarkup({
            attributes: booking,
            name: "x",
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: booking,
              name: "width",
            }) /
              2,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
          SvgAttributes.getNumberFromMarkup({ attributes: booking, name: "y" }),
        );
      },
    ),
  );
  const markup = _render({ frame: 120 }),
    hand = SvgAttributes.fromMarker({ markup, marker: "worker-hand" }),
    booking = _booking({ markup, id: "visit" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
    660,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
    490,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 132 }),
      marker: "agreement-mark",
    }),
    /stroke-dashoffset="0"/,
  );
});
test("maximum-grid final bookings stay separate and inside their actual cells", () => {
  const markup = _render({ frame: 150, input: fixtures[2].input });
  const boxes = [...markup.matchAll(/<rect data-booking[^>]+>/g)].map(
    (match) => ({
      x: SvgAttributes.getNumberFromMarkup({ attributes: match[0], name: "x" }),
      y: SvgAttributes.getNumberFromMarkup({ attributes: match[0], name: "y" }),
      width: SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "width",
      }),
      height: SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "height",
      }),
    }),
  );
  assert.equal(boxes.length, 5);
  boxes.forEach((box, index) => {
    assert.ok(
      box.x >= 240 &&
        box.y >= 214 &&
        box.x + box.width <= 780 &&
        box.y + box.height <= 442,
    );
    boxes
      .slice(index + 1)
      .forEach((other) =>
        assert.ok(
          box.x + box.width <= other.x ||
            other.x + other.width <= box.x ||
            box.y + box.height <= other.y ||
            other.y + other.height <= box.y,
        ),
      );
  });
});
test("the participant grip clears the full proposal caption and agreed booking label", () => {
  const input = {
    ...fixtures[2].input,
    commitments: fixtures[2].input.commitments.map((item) => ({
      ...item,
      label: "界界界界界 界界界界界 界界界界界 界界界界",
    })),
  };
  [52, 76, 100].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const hand = SvgAttributes.fromMarker({
      markup,
      marker: "participant-hand",
    });
    const box = _booking({ markup, id: "4" });
    const supportText = markup.match(
      /<g data-booking-label="4">[\s\S]*?(<text[^>]*>[\s\S]*?<\/text>)/,
    )![1];
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: supportText,
        name: "y",
      }) -
        12 >
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }) +
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "r" }),
    );
    if (frame < 100) {
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: supportText,
          name: "y",
        }) -
          12 >
          442,
      );
      const connector = SvgAttributes.fromMarker({
        markup,
        marker: "proposal-label-connector",
      });
      assert.ok(
        connector.includes(
          `M${SvgAttributes.getNumberFromMarkup({ attributes: box, name: "x" }) + SvgAttributes.getNumberFromMarkup({ attributes: box, name: "width" }) / 2} ${SvgAttributes.getNumberFromMarkup({ attributes: box, name: "y" }) + SvgAttributes.getNumberFromMarkup({ attributes: box, name: "height" })}`,
        ),
      );
    } else {
      const offsets = [...supportText.matchAll(/ dy="([^"]+)"/g)].reduce(
        (sum, match) => sum + Number(match[1]),
        0,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: supportText,
          name: "y",
        }) +
          offsets +
          3 <=
          SvgAttributes.getNumberFromMarkup({ attributes: box, name: "y" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: box,
              name: "height",
            }),
      );
    }
  });
});

test("settled conflict preserves both actual labels through opaque-booking paint", () => {
  const markup = _render({ frame: 44 });
  PlannerVisibilityAssertions.assertCommitmentLabelsVisible({
    markup,
    labels: ["Caregiving", "Planning visit"],
  });
  const existing = PlannerVisibilityAssertions.getBookingBoxFromMarkup(
    _booking({ markup, id: "care" }),
  );
  const support = PlannerVisibilityAssertions.getBookingBoxFromMarkup(
    _booking({ markup, id: "visit" }),
  );
  assert.deepEqual(
    support,
    existing,
    "Both still occupy the conflicting planner cell",
  );
});
test("carry across the same row preserves every existing commitment label", () => {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    commitments: fixtures[2].input.commitments
      .filter(propNotEq("id", "3"))
      .map((item) => ({
        ...item,
        label: `${"界".repeat(21)}${item.id}`,
        ...(item.kind === "support"
          ? { agreedDayId: "3", agreedBandId: "0" }
          : {}),
      })),
  });
  Array.from({ length: 89 }, (_, index) => index + 12).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    PlannerVisibilityAssertions.assertCommitmentLabelsVisible({
      markup,
      labels: input.commitments.map(prop("label")),
    });
    assert.equal((markup.match(/data-kind="support"/g) ?? []).length, 1);
  });
});
