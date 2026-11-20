import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CapabilityGlyph } from "./CapabilityGlyph";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** Authored legend labels explain all four independent categorical states. */
export function CapabilityLegend({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const states = ["included", "absent", "conditional", "unknown"] as const;
  return (
    <g opacity={motion.reveal(frame, 96)}>
      {states.map((state, index) => {
        const label = {
          text: input.stateLabels[state],
          x: 94 + index * 218,
          y: 548,
          width: 180,
          fontSize: 14 as const,
          maxLines: 2,
        };
        return (
          <g key={state} aria-label={label.text}>
            <CapabilityGlyph state={state} x={76 + index * 218} y={553} />
            <FitText
              {...label}
              breakLongWords
              normalizeWhitespace
              color={tokens.color.textMuted}
            />
          </g>
        );
      })}
    </g>
  );
}
