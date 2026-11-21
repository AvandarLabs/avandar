import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { ReactNode } from "react";
/** Supplies TerminalType with its authored study label. */
export function TerminalHeading(): ReactNode {
  return (
    <Eyebrow>
      {getStockDisplayCopyFromDescriptor({
        descriptor: LEGACY_DISPLAY_COPY["terminal-type"].terminalType,
      })}
    </Eyebrow>
  );
}
