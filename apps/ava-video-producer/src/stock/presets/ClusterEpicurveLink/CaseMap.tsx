import { STOCK } from "../../stockPalette";
import { CasePin } from "./CasePin";
import { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import { InvestigationBracket } from "./InvestigationBracket";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The bracket and bin-focus outlines represent independent selections. */
export function CaseMap({ input, frame, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={45}
        y={130}
        width={280}
        height={220}
        rx={8}
        fill={STOCK.surface}
      />
      <InvestigationBracket input={input} frame={frame} accent={accent} />
      {getCasePositionsFromInput(input).map((position) => (
        <CasePin
          key={position.record.id}
          position={position}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
