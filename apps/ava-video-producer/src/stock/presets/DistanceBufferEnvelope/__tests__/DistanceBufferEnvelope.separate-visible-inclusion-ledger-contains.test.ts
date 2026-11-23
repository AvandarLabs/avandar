import assert from "node:assert/strict";
import test from "node:test";
import { propNotEq, prop, propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_INPUT, fixtures } from "../DistanceBufferEnvelope.fixtures";
import { inputSchema, type Input } from "../DistanceBufferEnvelope.schema";
import {
  _render,
  _values,
  _tags,
  _getVisibleRowKeys,
} from "./DistanceBufferEnvelopeTestHelpers";

function _assertDenseLedgerTokenClearance(input: Readonly<Input>): void {
  Array.from({ length: 34 }, (_, index) => {
    return 106 + index;
  }).forEach((frame) => {
    const markup = _render({ frame: frame, input: input }),
      paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup),
      texts = paint.filter(propEq("kind", "text"));
    SvgPaintAssertions.assertPaintClearance({
      texts,
      rectangles: paint.filter((item) => {
        return (
          item.kind === "rect" &&
          item.fill !== "none" &&
          item.opacity * item.fillOpacity > 0.9
        );
      }),
    });
    _tags({ markup, attribute: "data-ledger-token" }).forEach((tag) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: tag,
          name: "cx",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
        radius = SvgAttributes.getNumberFromMarkup({
          attributes: tag,
          name: "r",
        });
      texts.filter(propNotEq("ariaLabel", undefined)).forEach((text) => {
        return assert.equal(
          Math.max(x - radius, text.left) < Math.min(x + radius, text.right) &&
            Math.max(y - radius, text.top) < Math.min(y + radius, text.bottom),
          false,
          `Token crosses ${text.ariaLabel} at ${frame}`,
        );
      });
    });
  });
}

const SEPARATE_VISIBLE_INCLUSION_LEDGER_CONTAINS_ONLY_QUALIFYING_CASES = [
  {
    locations: [
      { id: "a", label: "Location A", x: 60, y: 50 },
      { id: "b", label: "Location B", x: 70, y: 70 },
      { id: "c", label: "Location C", x: 90, y: 50 },
    ],
    keys: ["1", "2"],
  },
  {
    locations: [
      { id: "a", label: "Outside A", x: 0, y: 0 },
      { id: "b", label: "Outside B", x: 100, y: 100 },
    ],
    keys: [],
  },
  {
    locations: [
      { id: "a", label: "Same", x: 50, y: 50 },
      { id: "b", label: "Same", x: 50, y: 50 },
    ],
    keys: ["1", "2"],
  },
  {
    locations: [
      { id: "a", label: "", x: 50, y: 50 },
      { id: "b", label: "", x: 90, y: 90 },
      { id: "c", label: "", x: 50, y: 50 },
    ],
    keys: ["1", "3"],
  },
  {
    locations: [
      { id: "on", label: "On boundary", x: 80, y: 50 },
      { id: "out", label: "Beyond", x: 80, y: 51 },
    ],
    keys: ["1"],
  },
];

test("separate visible inclusion ledger contains only qualifying stable keys while all source rows remain complete", () => {
  const cases = structuredClone(
    SEPARATE_VISIBLE_INCLUSION_LEDGER_CONTAINS_ONLY_QUALIFYING_CASES,
  );
  cases.forEach(({ locations, keys }) => {
    const markup = _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, locations },
    });
    assert.deepEqual(
      _getVisibleRowKeys({ markup, lane: "source" }),
      locations.map((_, index) => {
        return String(index + 1);
      }),
    );
    assert.deepEqual(_getVisibleRowKeys({ markup, lane: "included" }), keys);
    const painted = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      markup,
    ).filter((item) => {
      return (
        item.kind === "text" &&
        item.left >= 715 &&
        item.top >= 260 &&
        item.bottom < 560
      );
    });
    const expectedLabels = keys
      .map((key) => {
        return locations[Number(key) - 1].label;
      })
      .filter(Boolean);
    assert.deepEqual(painted.map(prop("ariaLabel")), expectedLabels);
    assert.equal(
      _tags({ markup, attribute: "data-location-position" }).length,
      locations.length,
    );
    assert.deepEqual(_values({ markup, attribute: "data-buffer-count" }), [
      `${keys.length}/${locations.length}`,
    ]);
  });
});

test("dense keyed rows and the actual transfer corridor keep tokens clear of all authored captions", () => {
  const input = {
    ...fixtures[2].input,
    locations: fixtures[2].input.locations.map((location) => {
      return {
        ...location,
        label: "界界界界界界 界界界界界界 界界界界界界",
      };
    }),
    labels: {
      ...fixtures[2].input.labels,
      unit: "界界界界界界界界 界界界界界界界界 界界界界界界界界 界界界界界界界界 界界界界界界界界",
      inside:
        "界界界界界界界界 界界界界界界界界 界界界界界界界界 界界界界界界界界 界界界界界界界界",
    },
  };
  inputSchema.parse(input);
  _assertDenseLedgerTokenClearance(input);
});
