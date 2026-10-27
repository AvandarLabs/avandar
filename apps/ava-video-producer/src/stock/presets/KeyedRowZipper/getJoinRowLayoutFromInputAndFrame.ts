import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./KeyedRowZipper.schema";

type Options = {
  input: Input;
  frame: number;
  side: "left" | "right";
  row: Input["leftRows"][number];
  index: number;
};
/** Data for getJoinRowLayoutFromInputAndFrame. */
type GetJoinRowLayoutResult = {
  isContext: boolean;
  x: number;
  y: number;
  height: number;
  progress: number;
};

/** Original-order result membership and bounded source-to-tray travel. */
export function getJoinRowLayoutFromInputAndFrame({
  input,
  frame,
  side,
  row,
  index,
}: Readonly<Options>): GetJoinRowLayoutResult {
  const results = input.leftRows.filter(
    (left) =>
      input.joinType === "left" ||
      input.rightRows.some(propEq("key", left.key)),
  );
  const resultIndex = results.findIndex(propEq("key", row.key));
  const isContext = resultIndex < 0;
  const sourceRows = side === "left" ? input.leftRows : input.rightRows;
  const contexts = sourceRows.filter(
    (candidate) => !results.some(propEq("key", candidate.key)),
  );
  const targetY = isContext
    ? 450 + contexts.findIndex(propEq("key", row.key)) * 44
    : 154 + resultIndex * 66;
  const progress = ramp(frame, 42, 66, EASE.inOut);
  return {
    isContext,
    x: mix(progress, side === "left" ? 44 : 500, side === "left" ? 64 : 480),
    y: mix(progress, 154 + index * 66, targetY),
    height: mix(progress, 60, isContext ? 40 : 60),
    progress,
  };
}
