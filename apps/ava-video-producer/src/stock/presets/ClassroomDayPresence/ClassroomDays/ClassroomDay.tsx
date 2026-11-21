import { Text } from "../../../graphics-common/Text";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { label: string; index: number; isActive: boolean };

/** One numbered day over its rule, emphasised while it is the active day. */
export function ClassroomDay({
  label,
  index,
  isActive,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <Text
        x={32 + index * 310}
        y={32}
        role="secondary"
        fill={tokens.color.textMuted}
      >
        {index + 1}
      </Text>
      <FitText
        text={label}
        x={56 + index * 310}
        y={32}
        width={270}
        fontSize={16}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M ${32 + index * 310} 90 H ${308 + index * 310}`,
        }}
        profile={tokens.sketch.shape}
        stroke={isActive ? tokens.color.accentAlt : tokens.color.line}
        strokeWidth={scales.stroke(
          isActive ? tokens.stroke.emphasis : tokens.stroke.hairline,
        )}
      />
    </g>
  );
}
