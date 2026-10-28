import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { DisclosureFieldText } from "./DisclosureFieldText";
import { DisclosurePolicyMark } from "./DisclosurePolicyMark";
import type { Input } from "./DisclosureAperture.schema";
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
  const sourceX = input.direction === "left-to-right" ? 60 : 540;
  const destinationX = input.direction === "left-to-right" ? 540 : 60;
  const progress = ramp(frame, 36 + shareIndex * 12, 24, EASE.inOut);
  const x = isCopy ? mix(progress, sourceX, destinationX) : sourceX;
  const y = 168 + index * 68 - (isCopy ? 4 * Math.sin(progress * Math.PI) : 0);
  if (isCopy && frame < 36 + shareIndex * 12) {
    return undefined;
  }
  return (
    <g
      data-original-field={isCopy ? undefined : field.id}
      data-outbound-copy={isCopy ? field.id : undefined}
      transform={`translate(${x} ${y})`}
    >
      <rect
        x={10}
        y={0}
        width={340}
        height={64}
        rx={2}
        fill={isCopy ? STOCK.elevated : STOCK.ground}
        stroke={isCopy ? accent : STOCK.line}
      />
      {input.showPolicyMarks ? (
        <DisclosurePolicyMark policy={field.disclosure} accent={accent} />
      ) : undefined}
      <DisclosureFieldText {...{ field, input }} />
    </g>
  );
}
