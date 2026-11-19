import { loopPhase } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Check } from "../graphics-common/Check";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Panel } from "../graphics-common/Panel";
import { Pill } from "../graphics-common/Pill";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { StatusCycleInput } from "../presets/StatusCycle/StatusCycle.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: StatusCycleInput };

/** Frames the progress bar waits after processing starts and before done. */
const PROGRESS_INSET = 3;
const SPINNER_PERIOD = 45;
const SPINNER_DASH = "0.28 0.72";
const SPINNER_STROKE = 2.5;
const DIAL_FILL_ALPHA = 0.035;
const PROCESSING_RING_ALPHA = 0.18;
const STATE_SIZE = 37;
const TRACK_CORNER = 3;

/** Draws the bounded authored status-cycle study at an explicit frame. */
export function StatusCycle({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { color, stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const states = input.states;
  const processing =
    motion.ramp(frame, states[1].at, motion.chip) *
    (1 - motion.ramp(frame, states.at(-1)!.at, motion.chip));
  const complete = motion.ramp(frame, states.at(-1)!.at, motion.chip);
  const progress = motion.ramp(
    frame,
    states[1].at + PROGRESS_INSET,
    Math.max(1, states.at(-1)!.at - states[1].at - PROGRESS_INSET * 2),
    motion.travel.easing,
  );
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["status-cycle"].statusCycle,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["status-cycle"].exampleState,
        })}
        color={accent}
      />
      <Panel x={174} y={157} width={612} height={293}>
        <Text role="footnote" x={212} y={201}>
          {getStockDisplayCopyFromDescriptor({
            descriptor: LEGACY_DISPLAY_COPY["status-cycle"].runStatus,
          })}
        </Text>
        <SketchedShape
          shape={{ kind: "circle", cx: 267, cy: 281, r: 42 }}
          profile={sketch.shape}
          fill={accent}
          fillOpacity={shapes.wash(DIAL_FILL_ALPHA)}
          stroke={color.line}
          strokeWidth={shapes.stroke(stroke.outline)}
        />
        <SketchedShape
          shape={{ kind: "circle", cx: 267, cy: 281, r: 30 }}
          profile={sketch.shape}
          fill="none"
          stroke={accent}
          strokeOpacity={processing * PROCESSING_RING_ALPHA}
          strokeWidth={shapes.stroke(stroke.default)}
        />
        <SketchedShape
          shape={{ kind: "circle", cx: 267, cy: 281, r: 30 }}
          profile={sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={shapes.stroke(SPINNER_STROKE)}
          pathLength={1}
          strokeDasharray={SPINNER_DASH}
          strokeDashoffset={-loopPhase(frame, SPINNER_PERIOD)}
          opacity={processing}
        />
        <circle
          cx={267}
          cy={281}
          r={7}
          fill={color.inactive}
          opacity={1 - motion.ramp(frame, states[1].at, motion.chip)}
        />
        <g opacity={complete}>
          <Check x={267} y={281} size={30} color={accent} />
        </g>
        {states.map((state, i) => {
          const opacity =
            motion.ramp(frame, state.at, motion.chip) *
            (i < states.length - 1
              ? 1 - motion.ramp(frame, states[i + 1].at, motion.chip)
              : 1);
          return (
            <g key={state.label} opacity={opacity}>
              <Text
                role="title"
                x={338}
                y={277}
                size={STATE_SIZE}
                fill={i === states.length - 1 ? accent : color.text}
              >
                {state.label}
              </Text>
              <Text role="label" x={338} y={310} fill={color.textMuted}>
                {state.detail}
              </Text>
            </g>
          );
        })}
        {input.showProgress ? (
          <>
            <rect
              x={212}
              y={363}
              width={536}
              height={6}
              rx={shapes.corner(TRACK_CORNER)}
              fill={color.line}
            />
            <rect
              x={212}
              y={363}
              width={Math.max(0.01, 536 * progress)}
              height={6}
              rx={shapes.corner(TRACK_CORNER)}
              fill={accent}
            />
          </>
        ) : null}
        <Text role="footnote" x={212} y={408}>
          {getStockDisplayCopyFromDescriptor({
            descriptor: LEGACY_DISPLAY_COPY["status-cycle"].sampleTask,
          })}
        </Text>
        <Text role="footnote" x={748} y={408} anchor="end" fill={accent}>
          {Math.round(progress * 100)}%
        </Text>
      </Panel>
      {states.map((state, i) => {
        return (
          <g key={state.label}>
            <circle
              cx={252 + i * 230}
              cy={511}
              r={4}
              fill={accent}
              fillOpacity={
                atomic.opacity["20"] +
                motion.ramp(frame, state.at, motion.chip) * atomic.opacity["80"]
              }
            />
            <Text role="secondary" x={268 + i * 230} y={516}>
              {state.label}
            </Text>
            {i < states.length - 1 ? (
              <SketchedShape
                shape={{ kind: "path", d: `M${352 + i * 230} 511 h90` }}
                profile={sketch.shape}
                stroke={color.line}
                strokeWidth={shapes.stroke(stroke.hairline)}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
