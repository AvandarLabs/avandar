import type { denseInput } from "../SharedReadingCircles.fixtures";
import type { _createRouteInputs } from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertFirstReaderPicksUpGroupOptions = {
  group: (Omit<
    typeof denseInput | ReturnType<typeof _createRouteInputs>[number],
    "startingShelf"
  > & { startingShelf: "front" | "side" })["readingGroups"][number];
  index: number;
  startingShelf: "front" | "side";
  input: Omit<
    typeof denseInput | ReturnType<typeof _createRouteInputs>[number],
    "startingShelf"
  > & { startingShelf: "front" | "side" };
};
