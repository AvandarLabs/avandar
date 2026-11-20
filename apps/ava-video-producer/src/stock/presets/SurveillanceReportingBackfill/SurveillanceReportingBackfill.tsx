import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { BackfillChart } from "./BackfillChart";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SurveillanceReportingBackfill.schema";
import type { ReactNode } from "react";
/** Explicit authored scene props. */
export type Props = GraphicProps & { input: Input };
/**
 * SurveillanceReportingBackfill renders the supplied quantities and explicit
 * timeline.
 */
export function SurveillanceReportingBackfill({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const earlier = input.records.filter(propEq("firstSnapshot", 0)).length;
  return (
    <g data-earlier-total={earlier} data-revised-total={input.records.length}>
      <LabelSlots
        labels={[
          [input.copy.context, 60, 30, 840, 16, 2],
          [input.copy.earlier, 60, 68, 400, 14, 3],
          [input.copy.revised, 500, 68, 400, 14, 3],
          [input.snapshots[0].label, 60, 127, 400, 14, 3],
          [input.snapshots[1].label, 500, 127, 400, 14, 3],
          [String(earlier), 60, 190, 100, 18, 1],
          [String(input.records.length), 500, 190, 100, 18, 1],
          [input.copy.newReports, 60, 225, 560, 12, 2],
          [input.copy.axis, 60, 575, 560, 12, 2],
          [input.copy.unit, 670, 548, 230, 12, 4],
        ]}
      />
      <ReportingTab frame={frame} accent={accent} />
      <BackfillChart input={input} frame={frame} accent={accent} />
      {input.records.map((record, index) => {
        return (
          <LabelSlots
            key={record.id}
            labels={[
              [String(index + 1), 600, 190 + index * 28, 24, 12, 1],
              [record.label, 630, 190 + index * 28, 280, 12, 1],
            ]}
          />
        );
      })}
    </g>
  );
}

/** The tab sliding from the earlier total to the revised one. */
function ReportingTab({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g data-reporting-tab="">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${mix(motion.ramp(frame, 36, motion.scale(36), motion.entrance.easing), 60, 500)} 198h380`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
