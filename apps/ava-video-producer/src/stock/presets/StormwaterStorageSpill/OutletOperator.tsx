import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };
/** The operator's hand stays on the outlet handle while setting it. */
export function OutletOperator({ frame, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const handleY = mix(motion.reveal(frame, 36), 210, 185);
  return (
    <g>
      <PersonGlyph x={270} y={185} size={42} role="worker" color={accent} />
      <SketchedShape
        shape={{ kind: "path", d: `M278 186L302 190L330 ${handleY}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <g data-gate="physical">
        <SketchedShape
          shape={{ kind: "path", d: `M330 230V${handleY}` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
      <circle data-hand="contact" cx={330} cy={handleY} r={4} fill={accent} />
      <g data-handle="contact">
        <SketchedShape
          shape={{ kind: "circle", cx: 330, cy: handleY, r: 7 }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.highlight}
        />
      </g>
    </g>
  );
}
