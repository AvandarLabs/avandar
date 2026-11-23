import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { RequestDispositionCaption } from "./RequestDispositionCaption";
import { useRequestDispositionPresentation } from "./useRequestDispositionPresentation";
import type { Input } from "../ProtectedWorkBoundary.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Disposition copy is visibly attached to its actual tray or work-slot target.
 */
export function RequestDisposition(props: Readonly<Props>): ReactNode {
  const presentation = useRequestDispositionPresentation(props);

  return (
    <g
      opacity={presentation.motion.ramp(
        props.frame,
        77,
        presentation.motion.scale(20),
      )}
    >
      <RequestDispositionCaption {...presentation} />
      {props.input.request.placement === "reschedule" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${presentation.position.x + presentation.position.width / 2} ${presentation.position.y + presentation.position.height} V518 H50 V522`,
          }}
          profile={presentation.tokens.sketch.shape}
          data-disposition-link={props.input.request.agreedSlotId ?? undefined}
          fill="none"
          stroke={props.accent}
        />
      ) : undefined}
      {props.input.request.placement === "defer" ? (
        <StockRect
          x={650}
          y={75}
          width={260}
          height={125}
          rx={presentation.scales.corner(presentation.tokens.corner.cell)}
          fill="none"
          stroke={presentation.tokens.color.highlight}
          strokeDasharray={presentation.atomic.dash.bold.join(" ")}
        />
      ) : undefined}
    </g>
  );
}
