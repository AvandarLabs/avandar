import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AreaLegend } from "./AreaLegend";
import { AreaSite } from "./AreaSite/AreaSite";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const SCENE_FADE_AT = 0;
/** Equal-area unit tiles reshape into circles at fixed authored sites. */
export function ProportionalSymbolArea({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, SCENE_FADE_AT)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.before, 48, 76, 400, 14, 3],
          [input.copy.after, 516, 76, 396, 14, 3],
        ]}
      />
      <StockRect
        x={48}
        y={148}
        width={400}
        height={400}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      {input.sites.map((site, index) => {
        return (
          <AreaSite key={site.id} {...{ site, index, input, frame, accent }} />
        );
      })}
      <AreaLegend {...{ input, frame, accent }} />
    </g>
  );
}
