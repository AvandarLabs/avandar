import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SiteAnchor } from "./SiteAnchor";
import { SiteKey } from "./SiteKey";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

type Props = {
  site: Input["sites"][number];
  index: number;
  frame: number;
  accent: string;
  selected: boolean;
  showLabel: boolean;
};
/** A short sampling stem rises from the exact retained eligible coordinate. */
export function SampleSite({
  site,
  index,
  frame,
  accent,
  selected,
  showLabel,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const lift = selected
    ? 14 * motion.ramp(frame, 36, motion.scale(72), motion.travel.easing)
    : 0;
  const x = 70 + site.x * 4.8;
  const y = 170 + site.y * 2.7;
  const railY = 162 + index * 26;
  return (
    <g data-site={site.id} data-selected-site={selected}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${y} L628 ${railY}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeOpacity={atomic.opacity["20"]}
      />
      <SiteAnchor
        siteId={site.id}
        x={x}
        y={y}
        lift={lift}
        accent={accent}
        selected={selected}
      />
      <SiteKey
        index={index}
        railY={railY}
        accent={accent}
        selected={selected}
      />
      {showLabel ? (
        <LabelSlots labels={[[site.label, 660, railY + 4, 282, 12, 1]]} />
      ) : undefined}
    </g>
  );
}
