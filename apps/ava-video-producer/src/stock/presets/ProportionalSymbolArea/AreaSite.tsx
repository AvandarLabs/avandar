import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { AreaSiteLabels } from "./AreaSiteLabels";
import { AreaTile } from "./AreaTile";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";

type Props = {
  site: Input["sites"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

const SITE_AT = 13;
const SITE_STEP = 3;
const SITE_FRAMES = 28;
const MORPH_AT = 51;
const MORPH_FRAMES = 59;
/** A site's total circle area derives from its unchanged integer value. */
export function AreaSite({
  site,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const radius = Math.sqrt((site.value * input.areaPerUnit) / Math.PI),
    progress = motion.ramp(
      frame,
      MORPH_AT,
      motion.scale(MORPH_FRAMES),
      motion.travel.easing,
    );
  return (
    <g
      opacity={motion.ramp(
        frame,
        SITE_AT + index * SITE_STEP,
        motion.scale(SITE_FRAMES),
      )}
    >
      {Array.from({ length: site.value }, (_, unitIndex) => {
        return (
          <AreaTile
            key={unitIndex}
            {...{ site, unitIndex, progress, radius, accent }}
            areaPerUnit={input.areaPerUnit}
          />
        );
      })}
      <SketchedShape
        data-symbol={site.id}
        data-area={site.value * input.areaPerUnit}
        shape={{
          kind: "circle",
          cx: 48 + site.x * 4,
          cy: 148 + site.y * 4,
          r: radius,
        }}
        profile={sketch.shape}
        fill={accent}
        fillOpacity={progress === 1 ? atomic.opacity["55"] : 0}
        stroke={accent}
        strokeOpacity={progress}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <AreaSiteLabels {...{ site, index, input, accent }} />
    </g>
  );
}
