import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { useWorkPiecePresentation } from "./useWorkPiecePresentation";
import { WorkPieceBody } from "./WorkPieceBody";
import { WorkPieceEffort } from "./WorkPieceEffort";
import type { getWorkPartitionFromInput } from "../getWorkPartitionFromInput";
import type { ReactNode } from "react";

type Props = {
  piece: ReturnType<typeof getWorkPartitionFromInput>[number];
  index: number;
  frame: number;
  accent: string;
  parentLabel: string;
  showEffortValues: boolean;
};
/** Preserve piece area while separating cuts and attaching external labels. */
export function WorkPiece(props: Readonly<Props>): ReactNode {
  const presentation = useWorkPiecePresentation(props);

  return (
    <g>
      <WorkPieceBody {...presentation} />
      <g opacity={presentation.separation}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${presentation.x + props.piece.width / 2} ${presentation.y + props.piece.height / 2} L624 ${presentation.labelY - 5} H646`,
          }}
          profile={presentation.tokens.sketch.shape}
          fill="none"
          stroke={presentation.color}
          strokeOpacity={presentation.atomic.opacity["45"]}
        />
        <circle
          cx={presentation.x + props.piece.width / 2}
          cy={presentation.y + props.piece.height / 2}
          r={3}
          fill={presentation.color}
        />
        <FitText
          text={props.piece.label}
          x={660}
          y={presentation.labelY}
          width={264}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
        <WorkPieceEffort {...presentation} />
      </g>
    </g>
  );
}
