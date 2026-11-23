import { FitText } from "../../primitives/FitText/FitText";
import { JoinHeadings } from "./JoinHeadings";
import { JoinRow } from "./JoinRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";

/** Frame, theme and complete validated authored input. */
export type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  input: Readonly<ParentProps>["input"];
};

/** Renders the join title and left rows in authored paint order. */
export function JoinTitleAndLeftRows(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.labels.title}
        x={44}
        y={52}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <JoinHeadings frame={options.frame} input={options.input} />
      {options.input.leftRows.map((row, index) => {
        return (
          <JoinRow
            key={row.key}
            frame={options.frame}
            accent={options.accent}
            input={options.input}
            row={row}
            index={index}
            side="left"
          />
        );
      })}
    </>
  );
}
