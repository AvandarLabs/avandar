import { StockRect } from "../../../primitives/StockRect";
import { RequestDisposition } from "../RequestDisposition/RequestDisposition";
import { BoundaryRequestLabel } from "./BoundaryRequestLabel";
import { useBoundaryRequestPresentation } from "./useBoundaryRequestPresentation";
import type { Input } from "../ProtectedWorkBoundary.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Outstanding request remains explicit in the tray or selected empty slot. */
export function BoundaryRequest(props: Readonly<Props>): ReactNode {
  const presentation = useBoundaryRequestPresentation(props);

  return (
    <g>
      <RequestDisposition
        frame={props.frame}
        input={props.input}
        accent={props.accent}
      />
      <g
        data-request={props.input.request.placement}
        data-request-outstanding="true"
        opacity={presentation.motion.ramp(
          props.frame,
          39,
          presentation.motion.scale(7),
        )}
      >
        <StockRect
          data-request-body="true"
          x={presentation.position.x}
          y={presentation.position.y}
          width={presentation.position.width}
          height={presentation.position.height}
          rx={presentation.scales.corner(6)}
          fill={presentation.tokens.color.elevated}
          stroke={props.accent}
        />
        <circle
          data-worker-hand="true"
          cx={presentation.position.x}
          cy={presentation.position.y + 12}
          r={5}
          fill={props.accent}
        />
        <BoundaryRequestLabel {...presentation} />
      </g>
    </g>
  );
}
