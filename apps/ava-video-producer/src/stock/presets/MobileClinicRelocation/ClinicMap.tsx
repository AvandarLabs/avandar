import { mix } from "../../../motion";
import { GlobeProjection } from "../../geography/GlobeProjection/GlobeProjection";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ClinicVehicle } from "./ClinicVehicle";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";

/** The dash of the drive between the two clinic sites. */
const ROUTE_DASH = "5 10";
type Props = { input: Input; frame: number; accent: string };
/** A schematic route preserves authored local coordinates in both contexts. */
export function ClinicMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const sites = input.sites.map((site) => {
    return {
      ...site,
      x: 70 + site.x * 430,
      y: 125 + site.y * 200,
    };
  });
  const progress = motion.ramp(
    frame,
    50,
    motion.scale(46),
    motion.travel.easing,
  );
  const x = mix(progress, sites[0].x, sites[1].x);
  const y = mix(progress, sites[0].y, sites[1].y);
  const awning =
    1 -
    motion.ramp(frame, 41, motion.panel, motion.exit.easing) +
    motion.ramp(frame, 96, motion.scale(17), motion.entrance.easing);
  return (
    <g>
      {input.view === "globe-to-local" ? (
        <g
          transform="translate(565 136)"
          opacity={
            1 - motion.ramp(frame, 36, motion.scale(24), motion.exit.easing)
          }
        >
          <SketchedShape
            shape={{ kind: "circle", cx: 0, cy: 0, r: 35 }}
            profile={tokens.sketch.shape}
            fill={tokens.color.surface}
            stroke={tokens.color.line}
          />
          <path
            d={GlobeProjection.getLandPathFromView({
              centerLongitude: 20,
              centerLatitude: 0,
              radius: 35,
            })}
            fill={tokens.color.inactive}
          />
        </g>
      ) : undefined}
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${sites[0].x} ${sites[0].y} L${sites[1].x} ${sites[1].y}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(18)}
        strokeLinecap="round"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${sites[0].x} ${sites[0].y} L${sites[1].x} ${sites[1].y}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeDasharray={ROUTE_DASH}
        fill="none"
      />
      {sites.map((site, index) => {
        return (
          <g key={site.id}>
            <g data-site-id={site.id}>
              <SketchedShape
                shape={{ kind: "circle", cx: site.x, cy: site.y, r: 9 }}
                profile={tokens.sketch.shape}
                fill={tokens.color.surface}
                stroke={accent}
              />
            </g>
            <FitText
              text={site.label}
              x={500}
              y={190 + index * 70}
              width={110}
              fontSize={12}
              maxLines={4}
              breakLongWords
              normalizeWhitespace
            />
            <SketchedShape
              shape={{
                kind: "path",
                d: `M490 ${190 + index * 70} L${site.x} ${site.y}`,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
            />
          </g>
        );
      })}
      <ClinicVehicle x={x} y={y} awning={awning} accent={accent} />
    </g>
  );
}
