import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ObservationSlot } from "./ObservationSlot/ObservationSlot";
import { ProseHeadings } from "./ProseHeadings";
import { SentenceSpans } from "./SentenceSpans";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ProseMeasurementLedger.schema";
import type { ReactNode } from "react";
/** Complete validated authored content and frame palette. */
export type Props = GraphicProps & { input: Input };
/** Keeps source context, exact semantic spans and review status together. */
export function ProseMeasurementLedger({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={motion.reveal(frame, 0)}
      data-method={input.method}
      data-review={input.reviewState}
    >
      <ProseHeadings input={input} frame={frame} />
      <SentenceSpans input={input} frame={frame} accent={accent} />
      {Array.from({ length: 6 }, (_, index) => {
        return (
          <ObservationSlot
            key={index}
            input={input}
            frame={frame}
            accent={accent}
            index={index}
          />
        );
      })}
    </g>
  );
}
