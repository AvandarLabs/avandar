import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoSemantic } from "../../../videoTheme/videoTheme.types";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; isReplacement: boolean };

function _getLabelsFromSelection({
  frame,
  input,
  isReplacement,
  motion,
  color,
}: Readonly<
  Props & { motion: VideoMotion; color: ResolvedVideoSemantic["color"] }
>) {
  const option = isReplacement ? input.replacement : input.rejected;
  const rationale = motion.reveal(frame, isReplacement ? 108 : 60);
  return [
    {
      text: isReplacement
        ? input.decisionLabels.selected
        : input.decisionLabels.rejected,
      y: 239,
      width: 216,
      fontSize: 14 as const,
      maxLines: 2,
      color: color.textMuted,
      opacity: isReplacement
        ? rationale
        : motion.ramp(frame, 48, motion.scale(30), motion.travel.easing),
    },
    {
      text: option.label,
      y: 325,
      width: 216,
      fontSize: 18 as const,
      maxLines: 3,
      color: color.text,
      opacity: 1,
    },
    {
      text: option.reason,
      y: 420,
      width: 272,
      fontSize: 16 as const,
      maxLines: 4,
      color: color.textMuted,
      opacity: rationale,
    },
  ];
}

/** Option names, states and rationales retain complete fixed-size text. */
export function SelectionCopy({
  frame,
  input,
  isReplacement,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const { color } = useGraphicTokens();
  const labels = _getLabelsFromSelection({
    frame,
    input,
    isReplacement,
    motion,
    color,
  });
  return (
    <g>
      {labels.map(({ opacity, ...label }, index) => {
        return (
          <g key={index} opacity={opacity} aria-label={label.text}>
            <FitText
              {...label}
              x={0}
              breakLongWords
              normalizeWhitespace
              anchor="middle"
            />
          </g>
        );
      })}
    </g>
  );
}
