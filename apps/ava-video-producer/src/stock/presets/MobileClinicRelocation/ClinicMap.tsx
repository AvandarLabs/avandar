import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ClinicGlobeContext } from "./ClinicGlobeContext/ClinicGlobeContext";
import { ClinicRoute } from "./ClinicRoute/ClinicRoute";
import { ClinicSiteLabels } from "./ClinicSiteLabels/ClinicSiteLabels";
import { ClinicVehicle } from "./ClinicVehicle/ClinicVehicle";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/** A schematic route preserves authored local coordinates in both contexts. */
export function ClinicMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const sites = input.sites.map((site) => {
    return { ...site, x: 70 + site.x * 430, y: 125 + site.y * 200 };
  });
  const progress = motion.ramp(
    frame,
    50,
    motion.scale(46),
    motion.travel.easing,
  );
  const x = Motion.mix({ t: progress, from: sites[0].x, to: sites[1].x });
  const y = Motion.mix({ t: progress, from: sites[0].y, to: sites[1].y });
  const awning =
    1 -
    motion.ramp(frame, 41, motion.panel, motion.exit.easing) +
    motion.ramp(frame, 96, motion.scale(17), motion.entrance.easing);
  return (
    <g>
      <ClinicGlobeContext {...{ input, frame, tokens, motion }} />
      <ClinicRoute {...{ tokens, scales, sites }} />
      <ClinicSiteLabels {...{ accent, tokens, sites }} />
      <ClinicVehicle {...{ x, y, awning, accent }} />
    </g>
  );
}
