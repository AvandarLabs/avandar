import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_INPUT } from "../CoordinateQualityTriage.fixtures";
import { inputSchema, type Input } from "../CoordinateQualityTriage.schema";
import { _render } from "./CoordinateQualityTriageTestHelpers";

function _assertSixVisibleSourceKeys(markup: string): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  const keys = paint.filter((item) => {
    return (
      item.kind === "text" &&
      item.ariaLabel !== undefined &&
      /^[1-6]$/.test(item.ariaLabel)
    );
  });
  assert.equal(keys.length, 6);
  SvgPaintAssertions.assertPaintClearance({ texts: keys, rectangles: [] });
}

function _assertVisibleRowKeyClearance(markup: string): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  SvgPaintAssertions.assertPaintClearance({
    texts: paint.filter((item) => {
      return item.kind === "text" && item.ariaLabel !== undefined;
    }),
    rectangles: [],
  });
}

function _assertCoincidentValidRowsRetainSixDataPlottedPoint(
  markup: ReturnType<typeof _render>,
): void {
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-plotted-point",
    }).tags.length,
    6,
  );
}

function _assertCoincidentValidRowsRetainSixDataRowKey(
  markup: ReturnType<typeof _render>,
): void {
  assert.equal(
    new Set(
      getSvgAttributeMatchesFromMarkup({
        markup: markup,
        attribute: "data-row-key",
      }).tags.map((tag) => {
        return `${SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" })},${SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "y" })}`;
      }),
    ).size,
    6,
  );
}

function _assertArrivedPlottedCopiesYieldToDataRowKey(
  input: Readonly<Input>,
): void {
  [true, false].forEach((showValues) => {
    const enabled = { ...input, showValues };
    [105, 111, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: enabled });
      const keys = getSvgAttributeMatchesFromMarkup({
        markup,
        attribute: "data-row-key",
      });
      assert.equal(keys.tags.length, 6);
      keys.tags.forEach((tag, index) => {
        return assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "y" }),
          136 + index * 69,
        );
      });
      if (frame >= 111) {
        getSvgAttributeMatchesFromMarkup({
          markup,
          attribute: "data-moving-row-key",
        }).tags.forEach((tag, index) => {
          return assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: tag,
              name: "opacity",
            }),
            index ? 0 : 1,
          );
        });
      }
      _assertVisibleRowKeyClearance(markup);
    });
  });
}

test("coincident valid rows retain six visible source keys and exact plotted-coordinate associations", () => {
  [
    [0, 0],
    [20, 40],
    [90, 180],
    [-90, -180],
  ].forEach(([latitude, longitude]) => {
    [true, false].forEach((showValues) => {
      const input = inputSchema.parse({
        ...DEFAULT_INPUT,
        showValues,
        rows: Array.from({ length: 6 }, (_, index) => {
          return {
            id: index ? `row ${index}` : "",
            latitude,
            longitude,
          };
        }),
      });
      const markup = _render({ frame: 150, input: input });
      const pointX = 50 + ((longitude + 180) / 360) * 340;
      const pointY = 180 + ((90 - latitude) / 180) * 210;
      _assertCoincidentValidRowsRetainSixDataPlottedPoint(markup);
      assert.equal(
        getSvgAttributeMatchesFromMarkup({
          markup: markup,
          attribute: "data-row-key",
        }).tags.length,
        6,
      );
      _assertCoincidentValidRowsRetainSixDataRowKey(markup);
      const associations = getSvgAttributeMatchesFromMarkup({
        markup: markup,
        attribute: "data-row-association",
      }).tags;
      assert.equal(associations.length, 6);
      associations.forEach((tag, index) => {
        assert.ok(tag.includes(`d="M${pointX} ${pointY}`));
        assert.ok(tag.includes(`L441 ${132 + index * 69}`));
      });
      _assertSixVisibleSourceKeys(markup);
    });
  });
});

test("arrived plotted copies yield to fixed coordinates while every persistent source key stays readable", () => {
  const input = {
    ...DEFAULT_INPUT,
    showValues: false,
    rows: Array.from({ length: 6 }, (_, index) => {
      return {
        id: `key ${index}`,
        latitude: 20,
        longitude: 40,
      };
    }),
  };
  _assertArrivedPlottedCopiesYieldToDataRowKey(input);
});

test("separate coincident groups retain distinct plotted representatives and explicit source-key membership", () => {
  const rows = Array.from({ length: 6 }, (_, index) => {
    return {
      id: `row ${index}`,
      latitude: Math.floor(index / 2) * 20,
      longitude: Math.floor(index / 2) * 30,
    };
  });
  [true, false].forEach((showValues) => {
    const markup = _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, rows, showValues },
    });
    assert.deepEqual(
      getSvgAttributeMatchesFromMarkup({
        markup,
        attribute: "data-plotted-key-reference",
      }).values,
      ["1", "1", "3", "3", "5", "5"],
    );
    assert.deepEqual(
      SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup)
        .filter((item) => {
          return item.kind === "text" && item.left === 472;
        })
        .map(prop("text")),
      ["→1", "→1", "→3", "→3", "→5", "→5"],
    );
    getSvgAttributeMatchesFromMarkup({
      markup,
      attribute: "data-moving-row-key",
    }).tags.forEach((tag, index) => {
      return assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "opacity" }),
        index % 2 ? 0 : 1,
      );
    });
  });
});
