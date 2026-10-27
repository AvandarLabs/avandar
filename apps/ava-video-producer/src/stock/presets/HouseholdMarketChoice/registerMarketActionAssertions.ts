import assert from "node:assert/strict";
import test from "node:test";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { fixtures } from "./HouseholdMarketChoice.fixtures";
import type { Input } from "./HouseholdMarketChoice.schema";

function _assertArmClearance(path: string): void {
  const points = [...path.matchAll(/[ML]([^ ]+) ([^ ML]+)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
  const [bodyX, bodyY] = points[0];
  if (bodyY + 18 >= 324 && bodyY - 15 <= 388) {
    assert.ok(bodyX - 9 >= 275 && bodyX + 9 <= 700);
  }
  points.slice(1).forEach((point, index) => {
    const origin = points[index];
    const crossings = [324, 388].flatMap((y) => {
      const progress = (y - origin[1]) / (point[1] - origin[1]);
      return progress > 0 && progress < 1
        ? [[origin[0] + progress * (point[0] - origin[0]), y]]
        : [];
    });
    [origin, point, ...crossings].forEach(([x, y]) => {
      assert.ok(x >= 30 && x <= 930 && y >= 230 && y <= 500);
      if (y >= 324 && y <= 388) {
        assert.ok(
          x >= 275 && x <= 700,
          `arm intersects role text at ${x},${y}`,
        );
      }
    });
  });
}

/**
 * Protect actual grip coordinates and actor clearance throughout the authored
 * choices.
 */
export function registerMarketActionAssertions(
  render: (options: Readonly<{ frame: number; input: Input }>) => string,
): void {
  test("shopper grips every moving product and clears both role rails at every frame", () => {
    fixtures.forEach(({ input }) => {
      Array.from(
        { length: Math.max(0, Math.ceil((180 - 0) / 1)) },
        (_, sampleIndex) => 0 + sampleIndex * 1,
      ).forEach((frame) => {
        const markup = render({ frame: frame, input: input });
        const arm = markup.match(/<path data-market-arm[^>]*d="([^"]+)"/);
        const hand = markup.match(/<circle data-market-hand[^>]*>/);
        assert.ok(arm && hand);
        _assertArmClearance(arm[1]);
        const moving = [
          ...markup.matchAll(/<g data-product="[^"]*"[^>]*>/g),
        ].filter(([attributes]) => attributes.includes('data-owner="shopper"'));
        assert.ok(
          moving.length <= 1,
          "one shopper carries one product at a time",
        );
        moving.forEach(([attributes]) => {
          const point = attributes.match(/translate\(([^ ]+) ([^)]+)\)/);
          assert.ok(point);
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: hand[0],
              name: "cx",
            }),
            Number(point[1]) + 23,
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: hand[0],
              name: "cy",
            }),
            Number(point[2]),
          );
        });
      });
    });
  });
}
