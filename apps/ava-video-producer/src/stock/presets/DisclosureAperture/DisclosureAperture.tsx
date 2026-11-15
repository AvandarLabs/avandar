import { STOCK } from "../../stockPalette";
import { AperturePanel } from "./AperturePanel";
import { DisclosureCopies } from "./DisclosureCopies";
import { DisclosureCopy } from "./DisclosureCopy";
import { DisclosureField } from "./DisclosureField";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";
/** Complete authored disclosure policy and source content. */
export type Props = GraphicProps & { input: Input };
/**
 * The original document stays complete while only explicitly shared duplicates
 * leave.
 */
export function DisclosureAperture({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const destinationX = input.direction === "left-to-right" ? 540 : 60;
  return (
    <g data-disclosure-direction={input.direction}>
      <rect
        x={60}
        y={156}
        width={360}
        height={360}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <rect
        x={540}
        y={156}
        width={360}
        height={360}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        d={`M${destinationX} 156 l180 42 l180 -42`}
        fill="none"
        stroke={STOCK.line}
      />
      <AperturePanel {...{ frame, input, accent }} />
      {input.fields.map((field, index) => (
        <DisclosureField
          key={field.id}
          {...{ field, index, frame, input, accent }}
          shareIndex={0}
          isCopy={false}
        />
      ))}
      <DisclosureCopies {...{ input, frame, accent }} />
      <DisclosureCopy input={input} />
    </g>
  );
}
