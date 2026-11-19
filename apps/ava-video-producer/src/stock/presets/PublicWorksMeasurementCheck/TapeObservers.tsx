import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
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
        const handX = index === 0 ? 200 : endX;
        const personX = handX + (index === 0 ? -30 : 30);
        return (
          <g key={observer.id} data-observer={observer.id}>
            <PersonGlyph x={personX} y={421} color={accent} />
            <g data-tape-hand={observer.id}>
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
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${personX} 452 V468 H${index === 0 ? 100 : 550} V480`,
              }}
              profile={tokens.sketch.shape}
              stroke={accent}
              opacity={0.35}
              fill="none"
            />
          </g>
        );
      })}
    </g>
  );
}
