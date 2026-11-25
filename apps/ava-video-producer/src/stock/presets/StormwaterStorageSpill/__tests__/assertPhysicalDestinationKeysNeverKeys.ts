import assert from "node:assert/strict";

/**
 * Asserts physical destination keys never cover an unrelated positive-volume
 * pool.
 */
export function assertPhysicalDestinationKeysNeverKeys({
  keys,
  pools,
}: Readonly<{ keys: Readonly<string[]>; pools: Readonly<string[]> }>): void {
  assert.deepEqual(
    keys.map((key) => {
      return key.match(/data-water-key="([^"]*)"/)![1];
    }),
    [
      "physical-infiltration",
      "physical-discharge",
      "physical-detained",
      "physical-overflow",
    ],
  );
  assert.deepEqual(
    pools
      .map((pool) => {
        return pool.match(
          /(?:data-water-pool|data-overflow-pool|data-water)="[^"]+"/,
        )![0];
      })
      .sort(),
    [
      'data-water-pool="infiltration"',
      'data-water-pool="discharge"',
      'data-water="detention"',
      'data-overflow-pool="physical"',
    ].sort(),
  );
}
