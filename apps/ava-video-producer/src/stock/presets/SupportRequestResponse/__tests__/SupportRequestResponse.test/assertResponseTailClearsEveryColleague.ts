import { assertResponseTailClearsEveryState as _assertResponseTailClearsEveryState } from "./assertResponseTailClearsEveryState";

/**
 * Asserts response tail clears every painted line of accepted dense
 * colleague names.
 */
export function assertResponseTailClearsEveryColleague(
  colleague: string,
): void {
  ["joins", "later", "declines"].forEach((state) => {
    return _assertResponseTailClearsEveryState({ state, colleague });
  });
}
