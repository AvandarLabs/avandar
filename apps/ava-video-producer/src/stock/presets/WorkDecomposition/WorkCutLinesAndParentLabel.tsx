import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { WorkCutLines } from "./WorkCutLines";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  separation: number;
  pieces: ReturnType<typeof getWorkPartitionFromInput>;
};

/** Renders the work cut lines and parent label in authored paint order. */
export function WorkCutLinesAndParentLabel(
  options: Readonly<Props>,
): ReactNode {
  return (
    <>
      <WorkCutLines
        frame={options.frame}
        pieces={options.pieces}
        layout={options.input.partitionLayout}
        accent={options.accent}
      />
      <FitText
        text={options.input.parentLabel}
        x={340}
        y={Motion.mix({
          t: options.separation,
          from: 340,
          to: 120,
        })}
        width={540}
        fontSize={20}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
