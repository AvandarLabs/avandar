import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/**
 * Homes, booking calendar and clinic doorway keep distinct physical regions.
 */
export function ReconnectSetting({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <SceneLabel text={input.sceneLabel} x={32} y={30} width={700} />
      <SceneLabel text={input.places.homeLabel} x={32} y={75} width={230} />
      <SceneLabel
        text={input.places.calendarLabel}
        x={485}
        y={75}
        width={220}
      />
      <SceneLabel text={input.places.clinicLabel} x={745} y={75} width={185} />
      <g data-clinic-door="760">
        <SketchedShape
          shape={{
            kind: "path",
            d: "M760 130 V450 H925 V130 Z M760 130 L925 105 V450",
          }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
      </g>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M500 130 H700 V450 H500 Z M500 155 H700 M530 120 V143 M670 120 V143",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
    </g>
  );
}
