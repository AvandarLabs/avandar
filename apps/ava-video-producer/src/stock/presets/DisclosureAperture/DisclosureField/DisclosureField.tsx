import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DisclosureFieldText } from "../DisclosureFieldText";
import { DisclosurePolicyMark } from "../DisclosurePolicyMark";
import { getCrossingFromShareIndex } from "../getCrossingFromShareIndex";
import { FieldOutline } from "./FieldOutline";
import type { VideoMotion } from "../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "../DisclosureAperture.schema";
import type { ReactNode } from "react";
/** Inputs for getFieldPosition. */
type GetFieldPositionArguments = Pick<
  Props,
  "frame" | "index" | "isCopy" | "input"
> & {
  crossing: ReturnType<typeof getCrossingFromShareIndex>;
  motion: VideoMotion;
};

type Props = {
  field: Input["fields"][number];
  index: number;
  shareIndex: number;
  isCopy: boolean;
  frame: number;
  input: Input;
  accent: string;
};

/** The original stays at its source; a copy arcs across to the destination. */
function _getFieldPosition({
  frame,
  index,
  isCopy,
  input,
  crossing,
  motion,
}: Readonly<GetFieldPositionArguments>): { x: number; y: number } {
  const sourceX = input.direction === "left-to-right" ? 60 : 540;
  const destinationX = input.direction === "left-to-right" ? 540 : 60;
  const progress = Motion.ramp({
    frame,
    at: crossing.at,
    dur: crossing.duration,
    easing: motion.travel.easing,
  });
  return {
    x: isCopy
      ? Motion.mix({ t: progress, from: sourceX, to: destinationX })
      : sourceX,
    y: 168 + index * 68 - (isCopy ? 4 * Math.sin(progress * Math.PI) : 0),
  };
}

/**
 * A permitted duplicate travels while its complete original stays printed in
 * place.
 */
export function DisclosureField({
  field,
  index,
  shareIndex,
  isCopy,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const crossing = getCrossingFromShareIndex({ shareIndex, motion });
  if (isCopy && frame < crossing.at) {
    return undefined;
  }
  const { x, y } = _getFieldPosition({
    frame,
    index,
    isCopy,
    input,
    crossing,
    motion,
  });
  return (
    <g
      data-original-field={isCopy ? undefined : field.id}
      data-outbound-copy={isCopy ? field.id : undefined}
      transform={`translate(${x} ${y})`}
    >
      <FieldOutline isCopy={isCopy} accent={accent} />
      {input.showPolicyMarks ? (
        <DisclosurePolicyMark policy={field.disclosure} accent={accent} />
      ) : undefined}
      <DisclosureFieldText {...{ field, input }} />
    </g>
  );
}
