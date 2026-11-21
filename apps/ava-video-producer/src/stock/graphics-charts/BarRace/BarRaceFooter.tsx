import { Motion } from "../../../motion";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { BarRaceFooterData } from "./BarRace.types";
import type { ReactNode } from "react";

type Props = BarRaceFooterData;

/** Renders the bar race footer layer for BarRace. */
export function BarRaceFooter(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="data" x={64} y={580} fill={options.color.textMuted}>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["bar-race"].illustrativeValuesFixed0100Scale,
        })}
      </Text>
      <Text role="detail" x={896} y={580} anchor="end">
        {Math.round(
          Motion.mix({
            t: options.t,
            from: 1,
            to: 2,
          }),
        ) === 1
          ? getStockDisplayCopyFromDescriptor({
              descriptor: LEGACY_DISPLAY_COPY["bar-race"].periodTransition,
            })
          : getStockDisplayCopyFromDescriptor({
              descriptor: LEGACY_DISPLAY_COPY["bar-race"].periodFinal,
            })}
      </Text>
    </>
  );
}
