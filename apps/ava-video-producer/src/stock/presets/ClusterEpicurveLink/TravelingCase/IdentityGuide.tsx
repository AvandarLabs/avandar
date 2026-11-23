import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as TravelingCaseSharedProps } from "./TravelingCaseShared.types";
import type { ReactNode } from "react";

type Props = Pick<TravelingCaseSharedProps, "position" | "accent">;

/** The dashed guide from a case's map record to its histogram segment. */
export function IdentityGuide({
  position: { record, mapX, mapY, histogramX, histogramY },
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{
        kind: "line",
        x1: mapX,
        y1: mapY,
        x2: histogramX,
        y2: histogramY - 6,
      }}
      profile={tokens.sketch.shape}
      data-identity-guide={record.id}
      stroke={accent}
      strokeOpacity={atomic.opacity["45"]}
      strokeDasharray={tokens.dash.guide.join(" ")}
    />
  );
}
