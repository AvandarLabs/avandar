import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { type Input } from "../PooledDonorAllocation.schema";
import { assertOneCoordinatorSlidesConfiguredMoving as _assertOneCoordinatorSlidesConfiguredMoving } from "./assertOneCoordinatorSlidesConfiguredMoving";
import { PooledDonorAllocationTestState } from "./PooledDonorAllocationTestState";

const { render: _render } = PooledDonorAllocationTestState;

/**
 * Asserts one coordinator slides each configured request batch with a
 * connected scoop.
 */
export function assertOneCoordinatorSlidesConfiguredHand({
  _,
  index,
  input,
}: Readonly<{
  _: Readonly<Input["requests"][number]>;
  index: number;
  input: Readonly<Input>;
}>): void {
  const markup = _render({ frame: 74 + index * 20, input: input });
  const hand = markup.match(/<circle data-coordinator-hand[^>]*>/);
  const arm = markup.match(/<path data-coordinator-arm[^>]*>/);
  const support = markup.match(/<path data-allocation-scoop[^>]*>/);
  assert.ok(
    hand && arm && support,
    "allocation requires connected coordinator handling geometry",
  );
  const moving = [...markup.matchAll(/<g data-token="[^"]*"[^>]*>/g)].filter(
    ([attributes]) => {
      return attributes.includes('data-owner="coordinator"');
    },
  );
  assert.equal(
    moving.length,
    input.allocations
      .filter(propEq("requestId", input.requests[index].id))
      .reduce((sum, item) => {
        return sum + item.credits;
      }, 0),
  );
  _assertOneCoordinatorSlidesConfiguredMoving({ moving, hand, support });
}
