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
  total: number;
};

/** Renders the work unit and effort labels in authored paint order. */
export function WorkUnitAndEffortLabels(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.unitLabel}
        x={340}
        y={564}
        width={400}
        fontSize={14}
        maxLines={1}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      {options.input.showEffortValues ? (
        <FitText
          text={String(options.total)}
          x={100}
          y={564}
          width={60}
          fontSize={16}
          maxLines={1}
          normalizeWhitespace
          color={options.accent}
        />
      ) : undefined}
    </>
  );
}
