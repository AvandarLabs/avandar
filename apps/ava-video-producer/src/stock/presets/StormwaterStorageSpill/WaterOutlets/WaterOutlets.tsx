import { SketchedShape } from "../../../primitives/SketchedShape";
import { useWaterOutletsPresentation } from "./useWaterOutletsPresentation";
import type { Input } from "../StormwaterStorageSpill.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Infiltration and controlled discharge occupy separate physical outlets. */
export function WaterOutlets(props: Readonly<Props>): ReactNode {
  const presentation = useWaterOutletsPresentation(props);

  return (
    <g>
      {presentation.outlets.map((outlet) => {
        return (
          <g key={outlet.id}>
            <g data-outlet={outlet.id}>
              <SketchedShape
                shape={{ kind: "path", d: outlet.path }}
                profile={presentation.tokens.sketch.shape}
                fill="none"
                stroke={outlet.color}
                strokeWidth={presentation.scales.stroke(
                  presentation.tokens.stroke.emphasis,
                )}
                opacity={outlet.amount > 0 ? presentation.progress : 0}
              />
            </g>
            <rect
              data-water-pool={outlet.id}
              x={outlet.x}
              y={400}
              width={
                ((140 * outlet.amount) / props.input.event.incomingM3) *
                presentation.progress
              }
              height={12}
              fill={outlet.color}
            />
          </g>
        );
      })}
    </g>
  );
}
