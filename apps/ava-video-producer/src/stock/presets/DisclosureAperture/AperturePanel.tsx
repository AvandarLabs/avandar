import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCrossingFromShareIndex } from "./getCrossingFromShareIndex";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  let numSharedFields = 0;
  return (
    <g>
      <StockRect
        x={452}
        y={156}
        width={56}
        height={360}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.elevated}
        stroke={accent}
      />
      {input.fields.map((field, index) => {
        if (field.disclosure !== "share") {
          return undefined;
        }
        const crossing = getCrossingFromShareIndex(numSharedFields++, motion);
        if (frame < crossing.at || frame >= crossing.at + crossing.duration) {
          return undefined;
        }
        return (
          <OpenAperture
            key={field.id}
            fieldId={field.id}
            index={index}
            accent={accent}
          />
        );
      })}
    </g>
  );
}

/** An opening in the panel opposite a field while its share passes. */
function OpenAperture({
  fieldId,
  index,
  accent,
}: Readonly<{ fieldId: string; index: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <rect
        data-open-aperture={fieldId}
        x={452}
        y={164 + index * 68}
        width={56}
        height={68}
        fill={tokens.color.ground}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M452 ${164 + index * 68} h56 M452 ${232 + index * 68} h56`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
      />
    </g>
  );
}
