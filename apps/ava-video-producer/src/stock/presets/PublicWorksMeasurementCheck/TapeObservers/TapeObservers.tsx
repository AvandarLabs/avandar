import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { TapeObserver } from "./TapeObserver";
import type { Input } from "../PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; endX: number; accent: string };
/** Two named observers hold the moving tape ends with attached hands. */
export function TapeObservers({
  input,
  endX,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
