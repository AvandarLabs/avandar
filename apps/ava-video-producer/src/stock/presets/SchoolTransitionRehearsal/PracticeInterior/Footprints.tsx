import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PracticeInteriorShared } from "./PracticeInteriorShared";
import type { ReactNode } from "react";

type Props = { finalStep: number; accent: string };

/** Footprints marking the practised route, fading in on the final step. */
export function Footprints({ finalStep, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g opacity={tokens.alpha.ghost * finalStep} fill={accent}>
      {Array.from({ length: 7 }, (_, index) => {
        return (
          <ellipse
            key={index}
            cx={410 + index * 45}
            cy={420 + (index % 2) * 7}
            rx={PracticeInteriorShared.FLOOR_MARK_RADIUS_X}
            ry={PracticeInteriorShared.FLOOR_MARK_RADIUS_Y}
          />
        );
      })}
    </g>
  );
}
