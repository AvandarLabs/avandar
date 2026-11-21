import { assertShorterEqualLongerObservationsLength as _assertShorterEqualLongerObservationsLength } from "./assertShorterEqualLongerObservationsLength";

/**
 * Asserts shorter equal and longer observations retain one scale in either
 * structure.
 */
export function assertShorterEqualLongerObservationsStructure(
  structure: "low-wall" | "handrail",
): void {
  [2.25, 3.5, 6.75].forEach((length) => {
    return _assertShorterEqualLongerObservationsLength({ length, structure });
  });
}
