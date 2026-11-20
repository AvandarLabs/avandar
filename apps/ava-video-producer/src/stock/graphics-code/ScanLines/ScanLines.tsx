import { mix } from "../../../motion";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Panel } from "../../graphics-common/Panel";
import { Pill } from "../../graphics-common/Pill";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ScanRow } from "./ScanRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { ScanLinesInput } from "../../presets/ScanLines/ScanLines.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: ScanLinesInput };
const SCAN_AT = 23;
const SCAN_FRAMES = 110;
const HANDLE_CORNER = 5;
/** Draws the bounded authored scan-lines study at an explicit frame. */
export function ScanLines({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, corner, sketch } =
    GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const fields = input.fields;
  const t = motion.ramp(
    frame,
    SCAN_AT,
    motion.scale(SCAN_FRAMES),
    motion.travel.easing,
  );
  const scanY = mix(t, 138, 489);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-scan`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0" />
          <stop
            offset="1"
            stopColor={accent}
            stopOpacity={shapes.wash(atomic.opacity["12"])}
          />
        </linearGradient>
        <clipPath id={`${id}-scan-clip`}>
          <rect
            x={153}
            y={142}
            width={691}
            height={344}
            rx={shapes.corner(corner.card)}
          />
        </clipPath>
      </defs>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["scan-lines"].scanningPass,
        })}
      </Eyebrow>
      <Pill
        x={744}
        y={44}
        width={152}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["scan-lines"].sampleRecords,
        })}
        color={accent}
      />
      <Panel x={153} y={142} width={691} height={344} radius={corner.card} />
      {fields.map((row, i) => {
        return (
          <ScanRow
            key={row}
            row={row}
            index={i}
            isLast={i === fields.length - 1}
            scanY={scanY}
            accent={accent}
            showChecks={input.showChecks}
          />
        );
      })}
      <g clipPath={`url(#${id}-scan-clip)`}>
        <rect
          x={153}
          y={scanY - 67}
          width={691}
          height={67}
          fill={`url(#${id}-scan)`}
        />
        <SketchedShape
          shape={{ kind: "path", d: `M153 ${scanY} H844` }}
          profile={sketch.shape}
          stroke={accent}
          strokeWidth={shapes.stroke(stroke.outline)}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: "M115 142 V486" }}
        profile={sketch.shape}
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.default)}
      />
      <rect
        x={110}
        y={scanY - 12}
        width={10}
        height={24}
        rx={shapes.corner(HANDLE_CORNER)}
        fill={accent}
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
    </g>
  );
}
