import { RecursiveSplit } from "../RecursiveSplit";
import type { Input } from "../GeometryDetailBudget.schema";
import type { makeDetailSimplificationFromInput } from "../makeDetailSimplificationFromInput";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  event: ReturnType<typeof makeDetailSimplificationFromInput>["events"][number];
  input: Input;
  activeIndex: number;
  span: number;
  accent: string;
};

/** Renders the outline with authored geometry. */
export function DetailActiveRecursiveSplit({
  frame,
  event,
  input,
  activeIndex,
  span,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {frame < 111 && event.split ? (
        <RecursiveSplit
          {...{ input, event, frame }}
          at={51 + activeIndex * span}
          duration={span}
          accent={accent}
        />
      ) : undefined}
    </>
  );
}
