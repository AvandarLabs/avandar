import { EASE, ramp } from "../../../motion";
import { MeasuredStructure } from "./MeasuredStructure";
import { MeasurementCaptions } from "./MeasurementCaptions";
import { TapeObservers } from "./TapeObservers";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Community observers compare one authored measurement on a shared ruler. */
export function PublicWorksMeasurementCheck({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const endX =
    200 + input.observation.length * 65 * ramp(frame, 36, 72, EASE.inOut);
  return (
    <g>
      <MeasuredStructure input={input} accent={accent} />
      <TapeObservers input={input} endX={endX} accent={accent} />
      <MeasurementCaptions input={input} frame={frame} />
    </g>
  );
}
