import { ContextResolution } from "./ContextResolution";
import { ContextStatement } from "./ContextStatement";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./QualifyApparentConflict.schema";
import type { ReactNode } from "react";
/** Complete authored context-qualified claims. */
export type Props = GraphicProps & { input: Input };
/** Two original claims resolve into distinct explicitly authored contexts. */
export function QualifyApparentConflict({
  input,
  frame,
  accent,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.statements.map((statement, index) => (
        <ContextStatement
          key={statement.id}
          {...{ statement, index, frame, accent }}
          placement={input.contextPlacement}
        />
      ))}
      <ContextResolution {...{ ...remainingProps, input, frame, accent }} />
    </g>
  );
}
