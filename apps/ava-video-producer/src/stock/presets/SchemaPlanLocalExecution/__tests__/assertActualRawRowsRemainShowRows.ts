import { FIXTURES } from "../SchemaPlanLocalExecution.fixtures";
import { assertActualRawRowsRemainFrame as _assertActualRawRowsRemainFrame } from "./assertActualRawRowsRemainFrame";

/**
 * Asserts all actual raw rows remain inside the device throughout outbound
 * and inbound travel.
 */
export function assertActualRawRowsRemainShowRows(showRows: boolean): void {
  const input = { ...FIXTURES[2].input, showRows };
  [13, 34.5, 55, 56, 78.5, 100, 120, 150].forEach((frame) => {
    return _assertActualRawRowsRemainFrame({ frame, input });
  });
}
