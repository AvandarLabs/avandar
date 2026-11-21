import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { ReactNode } from "react";

/** Renders the cards footer layer for StaggerCards. */
export function CardsFooter(): ReactNode {
  return (
    <>
      <Text role="pill" x={64} y={554}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["stagger-cards"].conceptualCards,
        })}
      </Text>
      <Text role="pill" x={896} y={554} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["stagger-cards"].siblingsArriveInSequence,
        })}
      </Text>
    </>
  );
}
