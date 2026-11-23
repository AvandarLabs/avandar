import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  contactId: string;
  index: number;
  x: number;
  y: number;
  isAffected: boolean;
  isHandling: boolean;
};
/** The held tray and moving worker hand share the card's actual geometry. */
export function ContactHandling({
  contactId,
  index,
  x,
  y,
  isAffected,
  isHandling,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      {isAffected ? (
        <g data-tray={contactId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M550 ${281 + index * 102} v16 h366 v-13`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
        </g>
      ) : undefined}
      {isHandling ? (
        <g data-worker-hand={contactId}>
          <SketchedShape
            shape={{ kind: "path", d: `M760 150 L${x + 350} ${y + 28}` }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.accentAlt}
            strokeWidth={scales.stroke(tokens.stroke.heavy)}
            strokeLinecap="round"
          />
        </g>
      ) : undefined}
    </g>
  );
}
