import { inputSchema } from "../StormwaterStorageSpill.schema";
import { assertPhysicalWaterDestinationItsFrame as _assertPhysicalWaterDestinationItsFrame } from "./assertPhysicalWaterDestinationItsFrame";
import { type AssertPhysicalWaterDestinationItsShowBalanceOptions } from "./StormwaterStorageSpillContractTestState.types";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsShowBalance({
  showBalance,
  input,
  overflowSide,
  id,
}: Readonly<AssertPhysicalWaterDestinationItsShowBalanceOptions>): void {
  const supplied = { ...input, overflowSide, showBalance };
  inputSchema.parse(supplied);
  Array.from([24, 60, 90, 108, 150]).forEach((frame) => {
    return _assertPhysicalWaterDestinationItsFrame({ frame, supplied, id });
  });
}
