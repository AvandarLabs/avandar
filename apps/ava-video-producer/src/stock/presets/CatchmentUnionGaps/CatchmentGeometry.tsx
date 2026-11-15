import { STOCK } from "../../stockPalette";
import { CatchmentDefinitions } from "./CatchmentDefinitions";
import { CatchmentFootprints } from "./CatchmentFootprints";
import { CatchmentNames } from "./CatchmentNames";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string; id: string };
/**
 * Opaque union masks remove duplicate shading and retain only the outer edge.
 */
export function CatchmentGeometry({
  input,
  progress,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const definitionId = `catchment-${Array.from(id)
    .map((character) => character.codePointAt(0)?.toString(16))
    .join("-")}`;
  return (
    <g>
      <CatchmentDefinitions
        input={input}
        definitionId={definitionId}
        accent={accent}
      />
      <rect
        x={60}
        y={150}
        width={500}
        height={300}
        rx={8}
        fill={STOCK.surface}
      />
      <CatchmentFootprints
        input={input}
        progress={progress}
        accent={accent}
        definitionId={definitionId}
      />
      <CatchmentNames input={input} accent={accent} />
    </g>
  );
}
