import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RemedyStageLabels } from "./RemedyStageLabels";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The participant response follows the test and independently owns closure. */
export function RemedyResponse({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const response =
    frame < 120
      ? input.labels.pending
      : input.participantResponse === "accepted"
        ? input.labels.accepted
        : input.participantResponse === "not-accepted"
          ? input.labels.notAccepted
          : input.labels.pending;
  const isClosed = frame >= 120 && input.participantResponse === "accepted";
  return (
    <g>
      <RemedyStageLabels frame={frame} input={input} />
      <LabelSlots labels={[[response, 80, 559, 832, 18, 2]]} />
      <SketchedShape
        shape={{ kind: "circle", cx: 59, cy: 552, r: 10 }}
        profile={tokens.sketch.shape}
        data-response-marker="separate"
        fill={isClosed ? accent : "none"}
        stroke={isClosed ? accent : tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
