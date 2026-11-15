import { EASE, mix, ramp } from "../../../motion";

type Options = {
  frame: number;
  memberIndex: number;
  tableX: number;
  isSide: boolean;
};
/** Stages the upper seats before sliding lower seats into the vacated space. */
export function getReadingSeatFromInput({
  frame,
  memberIndex,
  tableX,
  isSide,
}: Readonly<Options>): { x: number; y: number } {
  const targetX =
    tableX + (memberIndex % 2 === 0 ? -60 : 60) * (isSide ? 1 : -1);
  const targetY = memberIndex < 2 ? 265 : 395;
  if (!isSide) {
    return {
      x: targetX,
      y: mix(
        ramp(frame, 44, 50, EASE.inOut),
        memberIndex < 2 ? 330 : 395,
        targetY,
      ),
    };
  }
  const initialX =
    tableX + (memberIndex === 2 ? -60 : memberIndex === 3 ? 0 : 60);
  return {
    x: mix(ramp(frame, 44, 20, EASE.inOut), initialX, targetX),
    y: mix(ramp(frame, 24, 20, EASE.inOut), 395, targetY),
  };
}
