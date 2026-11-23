import { FitText } from "../../../primitives/FitText/FitText";
import type { useWorkPiecePresentation } from "./useWorkPiecePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useWorkPiecePresentation>,
  "showEffortValues" | "piece" | "labelY" | "color"
>;
/** Render the work piece effort. */
export function WorkPieceEffort(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.showEffortValues ? (
        <FitText
          text={String(props.piece.effort)}
          x={640}
          y={props.labelY + 17}
          width={26}
          fontSize={12}
          maxLines={1}
          anchor="end"
          normalizeWhitespace
          color={props.color}
        />
      ) : undefined}
    </>
  );
}
