import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import {
  PooledDonorAllocationTestState,
  type AssertEveryAttributedCreditStaysRequestOptions,
} from "./PooledDonorAllocationTestState";

const { getTokenCoordinate: _getTokenCoordinate } =
  PooledDonorAllocationTestState;

/**
 * Asserts every attributed credit stays singular, restricted and visibly
 * above its envelope.
 */
export function assertEveryAttributedCreditStaysRequest({
  request,
  tokens,
  input,
  markup,
}: Readonly<AssertEveryAttributedCreditStaysRequestOptions>): void {
  const allocated = tokens.filter(([attributes]) => {
    return attributes.includes(`data-request="${request.id}"`);
  });
  assert.equal(
    allocated.length,
    input.allocations
      .filter(propEq("requestId", request.id))
      .reduce((sum, item) => {
        return sum + item.credits;
      }, 0),
  );
  const edge = markup.match(
    new RegExp(`<path data-envelope="${request.id}"[^>]+>`),
  );
  assert.ok(edge);
  const top = SvgAttributes.getNumberFromMarkup({
    attributes: edge[0],
    name: "data-edge",
  });
  allocated.forEach(([attributes]) => {
    return assert.ok(_getTokenCoordinate({ attributes, axis: "y" }) + 20 < top);
  });
}
