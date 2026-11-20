import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MeasurementStrip } from "./MeasurementStrip/MeasurementStrip";
import { WideLedgerCaptions } from "./WideLedgerCaptions";
import { WideSourceGuides } from "./WideSourceGuides";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./WideTableToObservations.schema";
import type { ReactNode } from "react";
/** Complete validated source measurements and frame palette. */
export type Props = GraphicProps & { input: Input };
/** Unpivots exact cells into rows without manufacturing measurements. */
export function WideTableToObservations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 0)}>
      <WideLedgerCaptions input={input} frame={frame} />
      <WideSourceGuides input={input} frame={frame} />
      {input.measures.flatMap((measure, measureIndex) => {
        return input.subjects.map((subject, subjectIndex) => {
          return (
            <MeasurementStrip
              key={`${subjectIndex}:${measureIndex}`}
              input={input}
              frame={frame}
              accent={accent}
              subjectIndex={subjectIndex}
              measureIndex={measureIndex}
            />
          );
        });
      })}
    </g>
  );
}
