import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import { HANDLE_CORNER } from "./ScanLines.constants";
import type { ScanHandleData } from "./ScanLines.types";
import type { ReactNode } from "react";

type Props = ScanHandleData;

/** Renders the scan handle layer for ScanLines. */
export function ScanHandle(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M115 142 V486" }}
        profile={options.sketch.shape}
        stroke={options.color.line}
        strokeWidth={options.shapes.stroke(options.stroke.default)}
      />
      <rect
        x={110}
        y={options.scanY - 12}
        width={10}
        height={24}
        rx={options.shapes.corner(HANDLE_CORNER)}
        fill={options.accent}
      />
      <Text role="meta" x={153} y={535}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["scan-lines"].inspect,
        })}
      </Text>
      <Text role="meta" x={844} y={535} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["scan-lines"].verify,
        })}
      </Text>
    </>
  );
}
