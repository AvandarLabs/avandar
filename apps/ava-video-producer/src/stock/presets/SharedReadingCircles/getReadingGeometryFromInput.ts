import { mix } from "../../../motion";
import { getSideReadingCarrierFromFrame } from "./getSideReadingCarrierFromFrame";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./SharedReadingCircles.schema";
/** Data for getReadingGeometryFromInput. */
type GetReadingGeometryFromInputResult = {
  tableX: number;
  startX: number;
  startY: number;
  bookX: number;
  bookY: number;
  progress: number;
};

/** Synchronized book travel keeps every physical copy on its own route. */
export function getReadingGeometryFromInput({
  input,
  frame,
  groupIndex,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  groupIndex: number;
  motion: VideoMotion;
}>): GetReadingGeometryFromInputResult {
  const tableX =
    input.books.length === 1
      ? 480
      : (input.startingShelf === "side" ? 220 : 130) +
        (groupIndex * (input.startingShelf === "side" ? 615 : 705)) /
          (input.books.length - 1);
  const startX = input.startingShelf === "front" ? tableX : 105;
  const startY = input.startingShelf === "front" ? 250 : 250 + groupIndex * 55;
  const progress = motion.ramp(
    frame,
    44,
    motion.scale(50),
    motion.travel.easing,
  );
  const side = getSideReadingCarrierFromFrame({
    frame,
    groupIndex,
    tableX,
    motion,
  });
  return {
    tableX,
    startX,
    startY,
    bookX: input.startingShelf === "side" ? side.bookX : tableX,
    bookY:
      input.startingShelf === "side" ? side.bookY : mix(progress, 250, 330),
    progress,
  };
}
