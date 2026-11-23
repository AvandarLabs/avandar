import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Pill } from "../../graphics-common/Pill";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { HEADING_SIZE } from "./BarRace.constants";
import type { BarRaceHeadingData } from "./BarRace.types";
import type { ReactNode } from "react";

type Props = BarRaceHeadingData;

/** Renders the bar race heading layer for BarRace. */
export function BarRaceHeading(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["bar-race"].rankingInMotion,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["bar-race"].fictionalData,
        })}
        color={options.accent}
      />
      <Text role="title" x={64} y={112} size={HEADING_SIZE}>
        {options.input.heading}
      </Text>
    </>
  );
}
