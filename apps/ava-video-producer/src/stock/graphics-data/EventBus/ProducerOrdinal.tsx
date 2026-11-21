import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { ENDPOINT_NUMBER_SIZE } from "./EventBus.constants";
import type { ProducerOrdinalData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = ProducerOrdinalData;

/** Renders the producer ordinal layer for EventBus. */
export function ProducerOrdinal(options: Readonly<Props>): ReactNode {
  return (
    <Text
      role="detail"
      x={options.center}
      y={101}
      size={ENDPOINT_NUMBER_SIZE}
      anchor="middle"
    >
      {getStockDisplayCopyFromDescriptor({
        descriptor: LEGACY_DISPLAY_COPY["event-bus"].producerNumber,
        values: { number: `0${options.i + 1}` },
      })}
    </Text>
  );
}
