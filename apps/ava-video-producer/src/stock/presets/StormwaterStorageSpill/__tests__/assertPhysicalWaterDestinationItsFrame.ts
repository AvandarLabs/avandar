import assert from "node:assert/strict";
import { assertPhysicalWaterDestinationItsCaption as _assertPhysicalWaterDestinationItsCaption } from "./assertPhysicalWaterDestinationItsCaption";
import { _render } from "./StormwaterStorageSpillTestHelpers";
import type { fixtures } from "../StormwaterStorageSpill.fixtures";
import type { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsFrame({
  frame,
  supplied,
  id,
}: Readonly<{
  frame: number;
  supplied: Omit<
    (typeof fixtures)[number]["input"],
    "overflowSide" | "showBalance"
  > & { overflowSide: "left" | "right"; showBalance: boolean };
  id: ((typeof REVIEW_FIXTURES)[number] | (typeof fixtures)[number])["id"];
}>): void {
  const markup = _render({ frame: frame, input: supplied });
  const colors = new Set<string>();
  ["infiltration", "discharge", "detained", "overflow"].forEach(
    (destination, index) => {
      const physical = markup.match(
        new RegExp(
          `<g data-water-key="physical-${destination}"[^>]*>(.*?)</g>`,
        ),
      )?.[1];
      const caption = markup.match(
        new RegExp(`<g data-water-key="caption-${destination}"[^>]*>(.*?)</g>`),
      )?.[1];
      assert.ok(physical, `${id}: missing physical ${destination} key`);
      assert.ok(caption, `${id}: missing caption ${destination} key`);
      const color = physical.match(/<circle[^>]*fill="([^"]+)"/)![1];
      _assertPhysicalWaterDestinationItsCaption({
        caption,
        color,
        physical,
        index,
        destination,
        markup,
        supplied,
      });
      colors.add(color);
    },
  );
  assert.equal(colors.size, 4);
}
