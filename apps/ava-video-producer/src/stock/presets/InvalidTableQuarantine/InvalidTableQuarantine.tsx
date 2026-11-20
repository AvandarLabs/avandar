import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getQuarantineStateFromFrame } from "./getQuarantineStateFromFrame";
import { QuarantinedRows } from "./QuarantinedRows";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./InvalidTableQuarantine.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** The shutter slat's line weight before the line weight scales it. */
const SLAT_STROKE = 8;
/** How opaque the shutter is while a blocked attempt stays visible. */
const SEE_THROUGH_SHUTTER = 0.87;
/** Invalidation closes reads until a whole replacement precedes reopening. */
export function InvalidTableQuarantine({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const emphasis = scales.stroke(tokens.stroke.emphasis);
  const {
    isReplaced,
    rows,
    arrival,
    height,
    readable,
    incoming,
    showReload,
    showAttempt,
  } = getQuarantineStateFromFrame({ frame, input, motion });
  return (
    <g data-readable={readable}>
      <StockRect
        x={100}
        y={146}
        width={540}
        height={324}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.line}
      />
      <QuarantinedRows rows={rows} x={110} />
      <StockRect
        data-read-shutter="true"
        x={110}
        y={155}
        width={520}
        height={height}
        fill={tokens.color.ground}
        fillOpacity={input.showAttempt ? SEE_THROUGH_SHUTTER : 1}
        stroke={tokens.color.highlight}
      />
      {height > 0 ? (
        <g data-shutter-slat="true">
          <SketchedShape
            shape={{ kind: "path", d: `M110 ${155 + height} H630` }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(SLAT_STROKE)}
          />
        </g>
      ) : null}
      {incoming ? (
        <g data-replacement-sheet="true">
          <QuarantinedRows
            rows={input.reload.rows}
            x={mix(arrival, 170, 110)}
            isReload
          />
        </g>
      ) : null}
      <LabelSlots
        labels={[
          [
            readable ? input.labels.readable : input.labels.blocked,
            680,
            183,
            230,
            20,
            5,
          ],
          [
            readable ? input.labels.readable : input.labels.invalid,
            110,
            70,
            520,
            18,
            3,
          ],
        ]}
      />
      {showReload ? (
        <LabelSlots labels={[[input.labels.reload, 680, 390, 230, 16, 4]]} />
      ) : null}
      {showAttempt ? (
        <g data-attempt-outcome={input.attempt.outcome}>
          <SketchedShape
            shape={{
              kind: "path",
              d:
                input.attempt.outcome === "failed"
                  ? "M690 330 l20 20 m0 -20 l-20 20"
                  : "M690 340 l8 8 l16 -20",
            }}
            profile={tokens.sketch.shape}
            opacity={input.reload.performed ? 1 - arrival : 1}
            fill="none"
            stroke={tokens.color.highlight}
            strokeWidth={emphasis}
          />
        </g>
      ) : null}
      {readable && isReplaced ? (
        <g data-reload-outcome="complete">
          <SketchedShape
            shape={{ kind: "path", d: "M690 340 l8 8 l16 -20" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={emphasis}
          />
        </g>
      ) : null}
      <g data-read-path="true">
        <SketchedShape
          shape={{ kind: "path", d: "M640 485 H940 V180 H922" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={readable ? accent : tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          strokeDasharray={readable ? undefined : atomic.dash.long.join(" ")}
        />
      </g>
    </g>
  );
}
