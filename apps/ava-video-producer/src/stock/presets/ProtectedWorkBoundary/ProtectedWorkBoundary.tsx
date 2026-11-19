import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { BoundaryRequest } from "./BoundaryRequest";
import { BoundaryWorker } from "./BoundaryWorker";
import { ProtectedSlot } from "./ProtectedSlot";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";
/** Frame-driven finite schedule and authored request disposition. */
export type Props = GraphicProps & { input: Input };
/** Preserves existing commitments while a worker moves the incoming request. */
export function ProtectedWorkBoundary({
  frame,
  input,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <defs>
        <pattern
          id={`${id}-protected`}
          width={8}
          height={8}
          patternUnits="userSpaceOnUse"
        >
          {input.protectedPattern === "hatch" ? (
            <SketchedShape
              shape={{ kind: "path", d: "M0 8 L8 0" }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.inactive}
              strokeWidth={scales.stroke(tokens.stroke.hairline)}
            />
          ) : (
            <circle cx={3} cy={3} r={1.2} fill={tokens.color.inactive} />
          )}
        </pattern>
      </defs>
      <LabelSlots
        labels={[
          [input.labels.unit, 45, 550, 400, 14, 3],
          [input.labels.example, 500, 550, 410, 14, 3],
          [input.labels.protected, 45, 195, 500, 12, 2],
        ]}
      />
      <BoundaryWorker frame={frame} input={input} accent={accent} />
      {input.slots.map((slot, index) => {
        return (
          <ProtectedSlot
            key={slot.id}
            slot={slot}
            index={index}
            frame={frame}
            input={input}
            accent={accent}
            id={id}
          />
        );
      })}
      <BoundaryRequest frame={frame} input={input} accent={accent} />
    </g>
  );
}
