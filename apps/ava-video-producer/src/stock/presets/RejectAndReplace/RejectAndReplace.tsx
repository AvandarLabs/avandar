import { SelectionCriterion } from "./SelectionCriterion";
import { SelectionOption } from "./SelectionOption";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";
/** Frame-controlled replacement of one authored selection. */
export type Props = GraphicProps & { input: Input };
/** A rejected proposal leaves a central slot for its authored replacement. */
export function RejectAndReplace({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SelectionCriterion {...{ frame, accent, input }} />
      <SelectionOption {...{ frame, input, accent }} isReplacement={false} />
      <SelectionOption {...{ frame, input, accent }} isReplacement />
    </g>
  );
}
