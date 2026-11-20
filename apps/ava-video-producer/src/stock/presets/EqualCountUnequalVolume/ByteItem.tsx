import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ByteItemLabels } from "./ByteItemLabels";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["groups"][number]["items"][number];
  input: Input;
  x: number;
  y: number;
  frame: number;
  accent: string;
};

/** Frames each byte strip takes to unfold to its measured width. */
const UNFOLD_FRAMES = 61;
/** A count tab's corner before the corner style scales it. */
const TAB_CORNER = 5;
/** Zero-byte items retain their identity tab and count despite zero width. */
export function ByteItem({
  item,
  input,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const unfolding = ramp(
    frame,
    49,
    motion.scale(UNFOLD_FRAMES),
    motion.travel.easing,
  );
  return (
    <g data-item-id={item.id} data-item-bytes={item.bytes}>
      <CountTab itemId={item.id} x={x} y={y} />
      <ByteItemLabels {...{ input, item, x, y }} />
      <rect
        data-byte-strip={item.id}
        x={440}
        y={y - 10}
        height={18}
        width={
          ((460 * item.bytes) / input.measure.scaleMaximumBytes) * unfolding
        }
        fill={accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 365} ${y} H440` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeOpacity={unfolding}
      />
    </g>
  );
}

/** The item's identity tab, kept even when it holds zero bytes. */
function CountTab({
  itemId,
  x,
  y,
}: Readonly<{ itemId: string; x: number; y: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <StockRect
      data-count-tab={itemId}
      x={x}
      y={y - 15}
      width={365}
      height={34}
      rx={scales.corner(TAB_CORNER)}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
