import { PublicWorksMeasurementCheckTestState } from "./PublicWorksMeasurementCheckTestState";

const { render: _render } = PublicWorksMeasurementCheckTestState;
import assert from "node:assert/strict";
import { defaultInput } from "../../PublicWorksMeasurementCheck.fixtures";
import { inputSchema } from "../../PublicWorksMeasurementCheck.schema";
import { assertShorterEqualLongerObservationsFrame as _assertShorterEqualLongerObservationsFrame } from "./assertShorterEqualLongerObservationsFrame";

/**
 * Asserts shorter equal and longer observations retain one scale in either
 * structure.
 */
export function assertShorterEqualLongerObservationsLength({
  length,
  structure,
}: Readonly<{ length: number; structure: "low-wall" | "handrail" }>): void {
  const input = {
    ...defaultInput,
    structure,
    specification: { ...defaultInput.specification, length: 3.5 },
    observation: { ...defaultInput.observation, length },
  };
  inputSchema.parse(input);
  [20, 36, 48, 72, 90, 108, 150].forEach((frame) => {
    return _assertShorterEqualLongerObservationsFrame({ frame, input, length });
  });
  const signed = length === 2.25 ? "-1.25" : length === 3.5 ? "0" : "+3.25";
  assert.ok(
    _render({ frame: 150, input: input }).includes(
      `aria-label="${signed} Demo metres"`,
    ),
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: { ...input, showDifference: false } }),
    /Observed minus promised/,
  );
}
