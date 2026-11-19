import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { MeasuredStructure } from "./MeasuredStructure";
import { MeasurementCaptions } from "./MeasurementCaptions";
import { TapeObservers } from "./TapeObservers";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Community observers compare one authored measurement on a shared ruler. */
export function PublicWorksMeasurementCheck({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const endX =
    200 +
    input.observation.length *
      65 *
      motion.ramp(frame, 36, motion.scale(72), motion.travel.easing);
  return (
    <g>
      <MeasuredStructure input={input} accent={accent} />
      <TapeObservers input={input} endX={endX} accent={accent} />
      <MeasurementCaptions input={input} frame={frame} />
    </g>
  );
}
