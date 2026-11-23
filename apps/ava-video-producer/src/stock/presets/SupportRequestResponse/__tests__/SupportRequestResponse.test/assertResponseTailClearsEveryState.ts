import { assertResponseTailClearsEveryFrame as _assertResponseTailClearsEveryFrame } from "./assertResponseTailClearsEveryFrame";

/**
 * Asserts response tail clears every painted line of accepted dense
 * colleague names.
 */
export function assertResponseTailClearsEveryState({
  state,
  colleague,
}: Readonly<{ state: string; colleague: string }>): void {
  return [50, 90, 110, 150].forEach((frame) => {
    return _assertResponseTailClearsEveryFrame({ frame, colleague, state });
  });
}
