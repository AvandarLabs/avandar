import { STOCK } from "../../stockPalette";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Each opening exists only opposite an actively passing authored share field.
 */
export function AperturePanel({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  let numSharedFields = 0;
  return (
    <g>
      <rect
        x={452}
        y={156}
        width={56}
        height={360}
        rx={4}
        fill={STOCK.elevated}
        stroke={accent}
      />
      {input.fields.map((field, index) => {
        if (field.disclosure !== "share") {
          return undefined;
        }
        const crossingAt = 36 + numSharedFields++ * 12;
        if (frame < crossingAt || frame >= crossingAt + 24) {
          return undefined;
        }
        return (
          <g key={field.id}>
            <rect
              data-open-aperture={field.id}
              x={452}
              y={164 + index * 68}
              width={56}
              height={68}
              fill={STOCK.ground}
            />
            <path
              d={`M452 ${164 + index * 68} h56 M452 ${232 + index * 68} h56`}
              stroke={accent}
            />
          </g>
        );
      })}
    </g>
  );
}
