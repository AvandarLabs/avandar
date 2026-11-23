import { Motion } from "../../../motion";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import type {
  GetBarRaceValueStateOptions,
  GetBarRaceValueStateResult,
} from "./BarRace.types";

/** Supplies BarRace with frame-specific rendering geometry or progress. */
export function getBarLayoutFromPhase({
  accent,
  tokens,
  t,
  enter,
  bar,
  i,
}: Readonly<GetBarRaceValueStateOptions>): GetBarRaceValueStateResult {
  const value =
    Motion.mix({
      t,
      from: bar.start,
      to: bar.end,
    }) * enter;
  const y =
    175 +
    Motion.mix({
      t,
      from: bar.from,
      to: bar.to,
    }) *
      77;
  const barColor =
    i === 0
      ? accent
      : getContentColorFromValue({
          value: bar.color,
          options: { tokens, accent },
        });
  return { value, y, barColor };
}
