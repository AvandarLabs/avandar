import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getJoinRowLayoutFromInputAndFrame } from "./getJoinRowLayoutFromInputAndFrame";
import { getJoinRowVisibility } from "./getJoinRowVisibility";
import { JoinKeyCell } from "./JoinKeyCell";
import { JoinRowLiteralValue } from "./JoinRowLiteralValue/JoinRowLiteralValue";
import { JoinRowMissingPartner } from "./JoinRowMissingPartner/JoinRowMissingPartner";
import { JoinRowSurface } from "./JoinRowSurface/JoinRowSurface";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  side: "left" | "right";
  row: Input["leftRows"][number];
  index: number;
};
/**
 * One source row retains its original data while joining or entering context.
 */
export function JoinRow({
  input,
  frame,
  accent,
  side,
  row,
  index,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y, height, isContext, progress } =
    getJoinRowLayoutFromInputAndFrame({
      input,
      frame,
      side,
      row,
      index,
      motion,
    });
  const hasPartner = input.rightRows.some(propEq("key", row.key));
  const visibility = getJoinRowVisibility({
    input,
    side,
    isContext,
    progress,
    hasPartner,
  });
  if (visibility.isHidden) {
    return undefined;
  }
  return (
    <g opacity={visibility.opacity}>
      <JoinRowSurface
        {...{ side, isContext, row, x, y, height, scales, tokens }}
        accent={accent}
      />
      {visibility.showKey ? (
        <JoinKeyCell value={row.key} {...{ x, y, side, accent }} />
      ) : undefined}
      <JoinRowLiteralValue {...{ row, x, y, isContext }} />
      <JoinRowMissingPartner {...{ visibility, row, y, input, progress }} />
    </g>
  );
}
