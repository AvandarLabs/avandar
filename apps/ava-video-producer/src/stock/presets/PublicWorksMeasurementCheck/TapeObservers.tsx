import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; endX: number; accent: string };
/** Two named observers hold the moving tape ends with attached hands. */
export function TapeObservers({
  input,
  endX,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <g data-tape="">
        <SketchedShape
          shape={{ kind: "line", x1: 200, y1: 386, x2: endX, y2: 386 }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
      {input.observers.map((observer, index) => {
        return (
          <TapeObserver
            key={observer.id}
            observerId={observer.id}
            index={index}
            endX={endX}
            accent={accent}
          />
        );
      })}
    </g>
  );
}

/** One observer holding a tape end, with a leader down to their name. */
function TapeObserver({
  observerId,
  index,
  endX,
  accent,
}: Readonly<{
  observerId: string;
  index: number;
  endX: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const handX = index === 0 ? 200 : endX;
  const personX = handX + (index === 0 ? -30 : 30);
  return (
    <g data-observer={observerId}>
      <PersonGlyph x={personX} y={421} color={accent} />
      <g data-tape-hand={observerId}>
        <SketchedShape
          shape={{
            kind: "line",
            x1: personX,
            y1: 421,
            x2: handX,
            y2: 386,
          }}
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

/** The faint leader from an observer down to their name. */
function ObserverLeader({
  personX,
  index,
  accent,
}: Readonly<{ personX: number; index: number; accent: string }>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${personX} 452 V468 H${index === 0 ? 100 : 550} V480`,
      }}
      profile={tokens.sketch.shape}
      stroke={accent}
      opacity={atomic.opacity["35"]}
      fill="none"
    />
  );
}
