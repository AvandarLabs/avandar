import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
};

/** Renders the work grouping label in authored paint order. */
export function WorkGroupingLabel(options: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={options.input.groupingLabel}
      x={660}
      y={146}
      width={264}
      fontSize={16}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
      color={options.accent}
    />
  );
}
