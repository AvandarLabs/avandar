import { mix, ramp } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DisclosureFieldText } from "../DisclosureFieldText";
import { DisclosurePolicyMark } from "../DisclosurePolicyMark";
import { getCrossingFromShareIndex } from "../getCrossingFromShareIndex";
import { FieldOutline } from "./FieldOutline";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "../DisclosureAperture.schema";
import type { ReactNode } from "react";

type Props = {
  field: Input["fields"][number];
  index: number;
  shareIndex: number;
  isCopy: boolean;
  frame: number;
  input: Input;
  accent: string;
};
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
/** The original stays at its source; a copy arcs across to the destination. */
function _getFieldPosition({
  frame,
  index,
  isCopy,
  input,
  crossing,
  motion,
}: Readonly<
  Pick<Props, "frame" | "index" | "isCopy" | "input"> & {
    crossing: ReturnType<typeof getCrossingFromShareIndex>;
    motion: VideoMotion;
  }
>) {
  const sourceX = input.direction === "left-to-right" ? 60 : 540;
  const destinationX = input.direction === "left-to-right" ? 540 : 60;
  const progress = ramp(
    frame,
    crossing.at,
    crossing.duration,
    motion.travel.easing,
  );
  return {
    x: isCopy ? mix(progress, sourceX, destinationX) : sourceX,
    y: 168 + index * 68 - (isCopy ? 4 * Math.sin(progress * Math.PI) : 0),
  };
}
