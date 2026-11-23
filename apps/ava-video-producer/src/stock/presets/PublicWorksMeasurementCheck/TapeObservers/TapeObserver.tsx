import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ObserverLeader } from "./ObserverLeader";
import type { ReactNode } from "react";

type Props = {
  observerId: string;
  index: number;
  endX: number;
  accent: string;
};
/** One observer holding a tape end, with a leader down to their name. */
export function TapeObserver({
  observerId,
  index,
  endX,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const handX = index === 0 ? 200 : endX;
  const personX = handX + (index === 0 ? -30 : 30);
  return (
    <g data-observer={observerId}>
      <PersonGlyph x={personX} y={421} color={accent} />
      <g data-tape-hand={observerId}>
        <SketchedShape
          shape={{ kind: "line", x1: personX, y1: 421, x2: handX, y2: 386 }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <circle cx={handX} cy={386} r={4} fill={accent} />
      <ObserverLeader personX={personX} index={index} accent={accent} />
    </g>
  );
}
