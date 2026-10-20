import { EASE, ramp } from "../../../motion";
/** Nonzero loss opens a bounded storage interval after the initial closure. */
export function getJarOpeningFromFrame({
  frame,
  loss,
}: Readonly<{ frame: number; loss: number }>): number {
  const lossOpening =
    loss > 0
      ? ramp(frame, 68, 6, EASE.inOut) * (1 - ramp(frame, 92, 8, EASE.inOut))
      : 0;
  // Lateral loss travel finishes before 92, clearing the whole jar opening.
  return (
    1 -
    ramp(frame, 49, 7, EASE.inOut) +
    lossOpening +
    ramp(frame, 101, 10, EASE.inOut)
  );
}
