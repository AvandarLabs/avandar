import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BarGrid } from "./BarGrid";
import { BarLegend } from "./BarLegend";
import { BarRaceFooter } from "./BarRaceFooter";
import { BarRaceHeading } from "./BarRaceHeading";
import { getRaceProgressFromFrame } from "./getRaceProgressFromFrame";
import { RacingBar } from "./RacingBar";
import type { Props } from "./BarRace.types";
import type { ReactNode } from "react";

/** Renders BarRace within the authored stock graphics. */
export function BarRace({ input, frame, accent }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { color, stroke, alpha, sketch } = tokens;
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { bars, t, enter, labelOpacity, hairline } = getRaceProgressFromFrame({
    input,
    frame,
    stroke,
    shapes,
    motion,
  });
  return (
    <g>
      <BarRaceHeading {...{ input, accent }} />
      <BarGrid {...{ color, alpha, sketch, hairline }} />
      {bars.map((bar, i) => {
        return (
          <RacingBar
            key={bar.label}
            {...{
              accent,
              atomic,
              tokens,
              alpha,
              shapes,
              t,
              enter,
              labelOpacity,
              hairline,
              bar,
              i,
            }}
          />
        );
      })}
      <BarLegend {...{ input, accent, tokens, bars }} />
      <BarRaceFooter {...{ color, t }} />
    </g>
  );
}
