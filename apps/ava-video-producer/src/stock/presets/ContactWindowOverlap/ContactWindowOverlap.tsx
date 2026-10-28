import { InvestigationStencil } from "./InvestigationStencil";
import { OverlapLedger } from "./OverlapLedger";
import { OverlapSetting } from "./OverlapSetting";
import { PresenceAxis } from "./PresenceAxis";
import { PresenceRibbon } from "./PresenceRibbon";
import { SceneLabel } from "./SceneLabel";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** A descending stencil reveals strict positive interval intersections. */
export function ContactWindowOverlap({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <OverlapSetting input={input} accent={accent} />
      <PresenceAxis input={input} />
      <InvestigationStencil input={input} frame={frame} accent={accent} />
      {input.records.map((record, index) => (
        <PresenceRibbon
          key={record.id}
          record={record}
          index={index}
          frame={frame}
          accent={accent}
          input={input}
        />
      ))}
      <OverlapLedger input={input} frame={frame} />
      <SceneLabel
        text={input.copy.qualifier}
        x={32}
        y={585}
        width={890}
        lines={1}
      />
    </g>
  );
}
