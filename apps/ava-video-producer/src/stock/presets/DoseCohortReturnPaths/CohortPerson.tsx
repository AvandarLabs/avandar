import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { ReactNode } from "react";
type Props = { id: string; x: number; y: number; accent: string };
/** One persistent silhouette occupies each authored participant lane. */
export function CohortPerson({ id, x, y, accent }: Readonly<Props>): ReactNode {
  return (
    <g data-cohort-person={id} transform={`translate(${x} ${y})`}>
      <PersonGlyph x={0} y={0} size={25} color={accent} />
    </g>
  );
}
