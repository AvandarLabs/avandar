import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AreaSiteLabels } from "../AreaSiteLabels";
import { AreaTile } from "../AreaTile";
import { type Props } from "./AreaSiteShared.types";
import { SiteSymbol } from "./SiteSymbol";
import type { ReactNode } from "react";

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
  const motion = GraphicThemeHooks.useGraphicMotion();
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
      <SiteSymbol {...{ site, input, radius, progress, accent }} />
      <AreaSiteLabels {...{ site, index, input, accent }} />
    </g>
  );
}
