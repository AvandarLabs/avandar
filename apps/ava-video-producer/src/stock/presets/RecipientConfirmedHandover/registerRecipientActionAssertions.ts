import assert from "node:assert/strict";
import test from "node:test";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { fixtures } from "./RecipientConfirmedHandover.fixtures";
import type { Input } from "./RecipientConfirmedHandover.schema";

/**
 * Check physical contact with every transported unit and the reserved actor
 * corridor.
 */
export function registerRecipientActionAssertions(
  render: (options: Readonly<{ frame: number; input: Input }>) => string,
): void {
  test("the recipient keeps a hand on each moving unit across all four counting rows", () => {
    fixtures.forEach(({ input }) => {
      Array.from(
        { length: Math.max(0, Math.ceil((180 - 0) / 1)) },
        (_, sampleIndex) => 0 + sampleIndex * 1,
      ).forEach((frame) => {
        const markup = render({ frame: frame, input: input });
        const hand = markup.match(/<circle data-recipient-hand[^>]*>/);
        const arm = markup.match(/<path data-recipient-arm[^>]*d="([^"]+)"/);
        assert.ok(hand && arm);
        const points = [...arm[1].matchAll(/[ML]([^ ]+) ([^ ML]+)/g)].map(
          (match) => [Number(match[1]), Number(match[2])],
        );
        points.forEach(([x, y]) =>
          assert.ok(x >= 193 && x <= 693 && y >= 125 && y <= 490),
        );
        const moving = [
          ...markup.matchAll(/<g data-good="[^"]*" data-unit="[^"]*"[^>]*>/g),
        ].filter(([attributes]) => attributes.includes('data-owner="mat"'));
        assert.ok(moving.length <= 1);
        moving.forEach(([attributes]) => {
          const point = attributes.match(/translate\(([^ ]+) ([^)]+)\)/);
          assert.ok(point);
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: hand[0],
              name: "cx",
            }),
            Number(point[1]) + 12,
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
