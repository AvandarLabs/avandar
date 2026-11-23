import { Text } from "../../graphics-common/Text";
import { BAR_LABEL_SIZE } from "./BarRace.constants";
import { BarShape } from "./BarShape";
import { getBarLayoutFromPhase } from "./getBarLayoutFromPhase";
import type { RacingBarData } from "./BarRace.types";
import type { ReactNode } from "react";

type Props = RacingBarData;
/** Renders BarRace's bar, its label and its interpolated value. */
export function RacingBar(props: Readonly<Props>): ReactNode {
  const { value, y, barColor } = getBarLayoutFromPhase(props);
  return (
    <g key={props.bar.label}>
      <g opacity={props.labelOpacity}>
        <Text x={177} y={y + 29} size={BAR_LABEL_SIZE} anchor="end">
          {props.bar.label}
        </Text>
      </g>
      <BarShape {...props} value={value} y={y} barColor={barColor} />
      <g opacity={props.labelOpacity}>
        <Text role="code" x={220 + value * 6} y={y + 29} fill={barColor}>
          {Math.round(value)}
        </Text>
      </g>
    </g>
  );
}
