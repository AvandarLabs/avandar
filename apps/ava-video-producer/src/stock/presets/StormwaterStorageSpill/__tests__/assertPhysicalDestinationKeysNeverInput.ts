import type { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { assertPhysicalDestinationKeysNeverKey as _assertPhysicalDestinationKeysNeverKey } from "./assertPhysicalDestinationKeysNeverKey";
import { assertPhysicalDestinationKeysNeverKeys as _assertPhysicalDestinationKeysNeverKeys } from "./assertPhysicalDestinationKeysNeverKeys";
import { _render } from "./StormwaterStorageSpillTestHelpers";

/**
 * Asserts physical destination keys never cover an unrelated positive-volume
 * pool.
 */
export function assertPhysicalDestinationKeysNeverInput(
  input: (typeof REVIEW_FIXTURES)[number]["input"],
): void {
  const markup = _render({ frame: 150, input: input });
  const pools = [
    ...markup.matchAll(
      /<rect[^>]*(?:data-water-pool|data-overflow-pool|data-water)="[^"]+"[^>]*>/g,
    ),
  ].map(([attributes]) => {
    return attributes;
  });
  const keys = [
    ...markup.matchAll(
      /<g data-water-key="physical-[^"]+"[^>]*><circle[^>]*>/g,
    ),
  ].map(([attributes]) => {
    return attributes;
  });
  _assertPhysicalDestinationKeysNeverKeys({ keys, pools });
  keys.forEach((key) => {
    return _assertPhysicalDestinationKeysNeverKey({ key, pools });
  });
}
