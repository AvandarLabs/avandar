import { mix } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Check } from "../graphics-common/Check";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Panel } from "../graphics-common/Panel";
import { Pill } from "../graphics-common/Pill";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { ScanLinesInput } from "../presets/ScanLines/ScanLines.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: ScanLinesInput };

const SCAN_AT = 23;
const SCAN_FRAMES = 110;
/** Pixels of scan travel over which a row turns from waiting to passed. */
const ROW_PASS_SPAN = 28;
const PLACEHOLDER_STROKE = 5;
const HANDLE_CORNER = 5;
const FIELD_SIZE = "xl";

/** Draws the bounded authored scan-lines study at an explicit frame. */
export function ScanLines({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { color, stroke, corner, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
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
        const y = 178 + i * 55;
        const passed = motion.ramp(scanY, y - 12, ROW_PASS_SPAN);
        return (
          <g key={row}>
            <Text role="field" x={184} y={y + 9} size={FIELD_SIZE}>
              {row}
            </Text>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M423 ${y + 2} h${118 + (i % 3) * 23} M625 ${y + 2} h${53 + (i % 2) * 34}`,
              }}
              profile={sketch.shape}
              stroke={color.inactive}
              strokeOpacity={atomic.opacity["28"]}
              strokeWidth={shapes.stroke(PLACEHOLDER_STROKE)}
              strokeLinecap="round"
            />
            <SketchedShape
              shape={{ kind: "circle", cx: 795, cy: y + 2, r: 11 }}
              profile={sketch.shape}
              fill={accent}
              fillOpacity={passed * shapes.wash(atomic.opacity["12"])}
              stroke={accent}
              strokeOpacity={
                atomic.opacity["15"] + passed * atomic.opacity["60"]
              }
              strokeWidth={hairline}
            />
            <g opacity={passed}>
              {input.showChecks ? (
                <Check x={795} y={y + 2} color={accent} size={9} />
              ) : null}
            </g>
            {i < fields.length - 1 ? (
              <SketchedShape
                shape={{ kind: "path", d: `M176 ${y + 29} H821` }}
                profile={sketch.shape}
                stroke={color.line}
                strokeOpacity={atomic.opacity["60"]}
                strokeWidth={hairline}
              />
            ) : null}
          </g>
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
