import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

const ROUTE_DASH = "5 10";
type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  sites: Input["sites"];
};
/** Draws the authored route beneath clinic sites and the vehicle. */
export function ClinicRoute({
  tokens,
  scales,
  sites,
}: Readonly<Props>): ReactNode {
  return (
    <>
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
    </>
  );
}
