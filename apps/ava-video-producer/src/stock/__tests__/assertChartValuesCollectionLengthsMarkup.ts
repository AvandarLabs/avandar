import assert from "node:assert/strict";
import { stockContracts } from "../registry/stockContracts";
import { LegacyRenderHarness } from "./legacyContractSupport/LegacyRenderHarness";

/**
 * Asserts chart values and collection lengths control bar widths and trace
 * coordinates.
 */
export function assertChartValuesCollectionLengthsMarkup(
  markup: ReturnType<typeof LegacyRenderHarness.render>,
): void {
  assert.match(markup, /width="150" height="43"/);
  assert.match(markup, />Authored</);
  assert.doesNotMatch(markup, /Alpha|Beta|Gamma|Delta/);
  const trace = structuredClone(stockContracts["line-trace"].defaultInput);
  Object.assign(trace, {
    points: [0, 100],
    reference: [100, 0],
    showReference: false,
  });
  assert.match(
    LegacyRenderHarness.render({ preset: "line-trace", input: trace }),
    /M121 458 L839 148/,
  );
}
