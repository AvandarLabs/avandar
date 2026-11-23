import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Caption } from "../../graphics-common/Caption";
import { Glyph } from "../../graphics-common/Glyph";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import { CENTER, CUBE_GLYPH } from "./OrbitalSystem.constants";
import type { OrbitalCoreData } from "./OrbitalSystem.types";
import type { ReactNode } from "react";

type Props = OrbitalCoreData;

/** Renders the orbital core layer for OrbitalSystem. */
export function OrbitalCore(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: CENTER.x,
          cy: CENTER.y,
          r: options.style.coreRadius,
        }}
        profile={options.tokens.sketch.shape}
        fill={options.tokens.color.surface}
        stroke={options.accent}
        strokeOpacity={options.style.coreStrokeAlpha}
        strokeWidth={options.shapes.stroke(options.style.coreStrokeWidth)}
      />
      <Glyph d={CUBE_GLYPH} color={options.accent} />
      <Caption>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["orbital-system"]
              .independentMotionSharedGravity,
        })}
      </Caption>
    </>
  );
}
