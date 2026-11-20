import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = { input: Input; threshold: number };
/**
 * The moving boundary and optional fixed-value ticks share one numeric domain.
 */
export function ClassRuler({ input, threshold }: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const min = input.schemes[0].breaks[0],
    max = input.schemes[0].breaks[2];
  const x = 64 + 424 * normalizeFiniteRange({ value: threshold, min, max });
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M64 538 H488" }}
        profile={sketch.shape}
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <SketchedShape
        data-threshold="true"
        data-value={threshold}
        shape={{ kind: "line", x1: x, y1: 514, x2: x, y2: 562 }}
        profile={sketch.shape}
        stroke={color.highlight}
        strokeWidth={shapes.stroke(stroke.emphasis)}
      />
      {input.showValueRuler
        ? input.zones.map((zone, index) => {
            return zone.value === null ? undefined : (
              <circle
                key={zone.id}
                data-value-tick={zone.id}
                cx={
                  64 +
                  424 * normalizeFiniteRange({ value: zone.value, min, max })
                }
                cy={538}
                r={4 + (index % 2)}
                fill={color.text}
              />
            );
          })
        : undefined}
    </g>
  );
}
