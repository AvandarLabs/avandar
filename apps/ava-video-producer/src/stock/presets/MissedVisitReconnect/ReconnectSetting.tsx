import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/**
 * Homes, booking calendar and clinic doorway keep distinct physical regions.
 */
export function ReconnectSetting({ input }: Readonly<Props>): ReactNode {
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
      <path
        data-clinic-door="760"
        d="M760 130 V450 H925 V130 Z M760 130 L925 105 V450"
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        d="M500 130 H700 V450 H500 Z M500 155 H700 M530 120 V143 M670 120 V143"
        fill="none"
        stroke={STOCK.line}
      />
    </g>
  );
}
