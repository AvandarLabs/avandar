import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../KeyedRowZipper.schema";
import type { ReactNode } from "react";

/** Inputs for JoinSourceHeadings. */
type ParentProps = {
  frame: number;
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
};

/** Renders the right source and key headings in authored paint order. */
export function RightSourceAndKeyHeadings(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.labels.right}
        x={500}
        y={110}
        width={390}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={options.input.labels.key}
        x={480}
        y={140}
        width={410}
        fontSize={12}
        maxLines={1}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
