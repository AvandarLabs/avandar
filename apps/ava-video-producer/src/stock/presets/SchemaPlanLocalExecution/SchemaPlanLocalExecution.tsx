import { ExecutionBoundaries } from "./ExecutionBoundaries";
import { ExecutionCaptions } from "./ExecutionCaptions";
import { LocalQueryResult } from "./LocalQueryResult";
import { LocalRows } from "./LocalRows";
import { PlannerExchange } from "./PlannerExchange";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";
/** Inputs for SchemaPlanLocalExecution. */
type Props = GraphicProps & { input: Input };

/**
 * Remote planning sends supplied copy; equality and sum run on retained rows.
 */
export function SchemaPlanLocalExecution({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ExecutionBoundaries />
      <ExecutionCaptions input={input} frame={frame} />
      <LocalRows input={input} frame={frame} accent={accent} />
      <PlannerExchange input={input} frame={frame} accent={accent} />
      {frame >= 139 ? (
        <LocalQueryResult input={input} accent={accent} />
      ) : undefined}
    </g>
  );
}
