import assert from "node:assert/strict";
import test from "node:test";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../StormwaterStorageSpill.fixtures";
import { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { _render } from "./StormwaterStorageSpillTestHelpers";

test("physical destination keys never cover an unrelated positive-volume pool", () => {
  REVIEW_FIXTURES.forEach(({ input }) => {
    const markup = _render({ frame: 150, input: input });
    const pools = [
      ...markup.matchAll(
        /<rect[^>]*(?:data-water-pool|data-overflow-pool|data-water)="[^"]+"[^>]*>/g,
      ),
    ].map(([attributes]) => attributes);
    const keys = [
      ...markup.matchAll(
        /<g data-water-key="physical-[^"]+"[^>]*><circle[^>]*>/g,
      ),
    ].map(([attributes]) => attributes);
    assert.deepEqual(
      keys.map((key) => key.match(/data-water-key="([^"]*)"/)![1]),
      [
        "physical-infiltration",
        "physical-discharge",
        "physical-detained",
        "physical-overflow",
      ],
    );
    assert.deepEqual(
      pools
        .map(
          (pool) =>
            pool.match(
              /(?:data-water-pool|data-overflow-pool|data-water)="[^"]+"/,
            )![0],
        )
        .sort(),
      [
        'data-water-pool="infiltration"',
        'data-water-pool="discharge"',
        'data-water="detention"',
        'data-overflow-pool="physical"',
      ].sort(),
    );
    keys.forEach((key) =>
      pools.forEach((pool) => {
        const width = SvgAttributes.getNumberFromMarkup({
            attributes: pool,
            name: "width",
          }),
          height = SvgAttributes.getNumberFromMarkup({
            attributes: pool,
            name: "height",
          });
        if (!width || !height) {
          return;
        }
        const x = SvgAttributes.getNumberFromMarkup({
            attributes: pool,
            name: "x",
          }),
          y = SvgAttributes.getNumberFromMarkup({
            attributes: pool,
            name: "y",
          }),
          cx = SvgAttributes.getNumberFromMarkup({
            attributes: key,
            name: "cx",
          }),
          cy = SvgAttributes.getNumberFromMarkup({
            attributes: key,
            name: "cy",
          });
        assert.ok(
          cx + 8 <= x ||
            cx - 8 >= x + width ||
            cy + 8 <= y ||
            cy - 8 >= y + height,
          "a physical key covers conserved water",
        );
      }),
    );
  });
});

test("destination keys clear the complete visible overflow crest", () => {
  [...REVIEW_FIXTURES, ...fixtures].forEach(({ input }) => {
    Array.from(["left", "right"] as const).forEach((overflowSide) => {
      const markup = _render({ frame: 150, input: { ...input, overflowSide } });
      const crest = SvgAttributes.fromMarker({ markup, marker: "crest" });
      if (
        SvgAttributes.getNumberFromMarkup({
          attributes: crest,
          name: "opacity",
        }) === 0
      ) {
        return;
      }
      const path = crest
        .match(/d="M([\d.]+) ([\d.]+)V([\d.]+)H([\d.]+)V400"/)!
        .slice(1)
        .map(Number);
      const [x, startY, topY, outside] = path;
      const segments = [
        {
          left: x - 1.5,
          right: x + 1.5,
          top: topY - 1.5,
          bottom: startY + 1.5,
        },
        {
          left: Math.min(x, outside) - 1.5,
          right: Math.max(x, outside) + 1.5,
          top: topY - 1.5,
          bottom: topY + 1.5,
        },
        {
          left: outside - 1.5,
          right: outside + 1.5,
          top: topY - 1.5,
          bottom: 401.5,
        },
      ];
      const keys = [
        ...markup.matchAll(
          /<g data-water-key="physical-[^"]+"[^>]*><circle[^>]*>/g,
        ),
      ].map(([attributes]) => attributes);
      keys.forEach((key) =>
        segments.forEach((segment) => {
          const cx = SvgAttributes.getNumberFromMarkup({
              attributes: key,
              name: "cx",
            }),
            cy = SvgAttributes.getNumberFromMarkup({
              attributes: key,
              name: "cy",
            });
          assert.ok(
            cx + 8 <= segment.left ||
              cx - 8 >= segment.right ||
              cy + 8 <= segment.top ||
              cy - 8 >= segment.bottom,
            "a destination key covers the overflow crest",
          );
        }),
      );
    });
  });
});
