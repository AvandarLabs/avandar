import { DestinationTray } from "./DestinationTray";
import { ReportHeader } from "./ReportHeader";
import { ReportPage } from "./ReportPage";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ReportPageBind.schema";
import type { ReactNode } from "react";
/**
 * Complete report binding props. The shared renderer owns the loop envelope.
 */
export type Props = GraphicProps & { input: Input };
/** Bind every ordered source section into an authored report at its tray. */
export function ReportPageBind({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ReportHeader input={input} frame={frame} accent={accent} />
      {input.sections.map((section, index) => (
        <ReportPage
          key={section.id}
          section={section}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
      <DestinationTray
        label={input.destinationLabel}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
