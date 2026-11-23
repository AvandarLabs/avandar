import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { ENDPOINT_NUMBER_SIZE } from "./EventBus.constants";
import type { SubscriberOrdinalData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = SubscriberOrdinalData;

/** Renders the subscriber ordinal layer for EventBus. */
export function SubscriberOrdinal(options: Readonly<Props>): ReactNode {
  return (
    <Text
      role="detail"
      x={options.center}
      y={520}
      size={ENDPOINT_NUMBER_SIZE}
      anchor="middle"
    >
      {getStockDisplayCopyFromDescriptor({
        descriptor: LEGACY_DISPLAY_COPY["event-bus"].subscriberNumber,
        values: { number: `0${options.i + 1}` },
      })}
    </Text>
  );
}
