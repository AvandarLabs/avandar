import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertActualRawRowsRemainBoundary as _assertActualRawRowsRemainBoundary } from "./assertActualRawRowsRemainBoundary";
import { render } from "./SchemaPlanLocalExecutionTestHelpers";
import type { DEFAULT_INPUT } from "../SchemaPlanLocalExecution.fixtures";

/**
 * Asserts all actual raw rows remain inside the device throughout outbound
 * and inbound travel.
 */
export function assertActualRawRowsRemainFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<typeof DEFAULT_INPUT> }>): void {
  const markup = render({ frame: frame, input: input }),
    boundary = SvgAttributes.fromMarker({ markup, marker: "local-boundary" });
  _assertActualRawRowsRemainBoundary({ boundary, markup });
  const start = markup.indexOf('<g data-outbound="true"');
  const end = markup.indexOf('<g data-inbound="true"');
  const outbound = markup.slice(start, end);
  assert.doesNotMatch(
    outbound,
    /data-raw-value=|data-local-row=|data-literal-value=/,
  );
  assert.ok(outbound.includes(`aria-label="${input.request.question}"`));
  assert.ok(outbound.includes(`aria-label="${input.columns.category}"`));
  assert.ok(outbound.includes(`aria-label="${input.columns.measure}"`));
  assert.equal((markup.match(/data-row-body=/g) || []).length, 6);
}
