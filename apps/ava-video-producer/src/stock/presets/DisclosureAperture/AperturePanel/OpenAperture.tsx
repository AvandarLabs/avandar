import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { fieldId: string; index: number; accent: string };

/** An opening in the panel opposite a field while its share passes. */
export function OpenAperture({
  fieldId,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
