import { DUR, EASE, loopPhase, ramp } from "../../motion";
import {
  Check,
  Panel,
  Pill,
  Eyebrow,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { StatusCycleInput } from "../presets/StatusCycle/StatusCycle.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: StatusCycleInput };

/** Draws the bounded authored status-cycle study at an explicit frame. */
export function StatusCycle({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const states = input.states;
  const processing =
    ramp(frame, states[1].at, DUR.chip) *
    (1 - ramp(frame, states.at(-1)!.at, DUR.chip));
  const complete = ramp(frame, states.at(-1)!.at, DUR.chip);
  const progress = ramp(
    frame,
    states[1].at + 3,
    Math.max(1, states.at(-1)!.at - states[1].at - 6),
    EASE.inOut,
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
        <Text x={212} y={201} size={14} mono fill={STOCK.muted}>
          {getStockDisplayCopyFromDescriptor({
            descriptor: LEGACY_DISPLAY_COPY["status-cycle"].runStatus,
          })}
        </Text>
        <circle
          cx={267}
          cy={281}
          r={42}
          fill={accent}
          fillOpacity={0.035}
          stroke={STOCK.line}
          strokeWidth={1.5}
        />
        <circle
          cx={267}
          cy={281}
          r={30}
          fill="none"
          stroke={accent}
          strokeOpacity={processing * 0.18}
          strokeWidth={2}
        />
        <circle
          cx={267}
          cy={281}
          r={30}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          pathLength={1}
          strokeDasharray="0.28 0.72"
          strokeDashoffset={-loopPhase(frame, 45)}
          opacity={processing}
        />
        <circle
          cx={267}
          cy={281}
          r={7}
          fill={STOCK.muted}
          opacity={1 - ramp(frame, states[1].at, DUR.chip)}
        />
        <g opacity={complete}>
          <Check x={267} y={281} size={30} color={accent} />
        </g>
        {states.map((state, i) => {
          const opacity =
            ramp(frame, state.at, DUR.chip) *
            (i < states.length - 1
              ? 1 - ramp(frame, states[i + 1].at, DUR.chip)
              : 1);
          return (
            <g key={state.label} opacity={opacity}>
              <Text
                x={338}
                y={277}
                size={37}
                weight={600}
                fill={i === states.length - 1 ? accent : STOCK.text}
              >
                {state.label}
              </Text>
              <Text x={338} y={310} size={18} fill={STOCK.muted}>
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
              rx={3}
              fill={STOCK.line}
            />
            <rect
              x={212}
              y={363}
              width={Math.max(0.01, 536 * progress)}
              height={6}
              rx={3}
              fill={accent}
            />
          </>
        ) : null}
        <Text x={212} y={408} size={14} mono fill={STOCK.muted}>
          {getStockDisplayCopyFromDescriptor({
            descriptor: LEGACY_DISPLAY_COPY["status-cycle"].sampleTask,
          })}
        </Text>
        <Text x={748} y={408} size={14} mono anchor="end" fill={accent}>
          {Math.round(progress * 100)}%
        </Text>
      </Panel>
      {states.map((state, i) => (
        <g key={state.label}>
          <circle
            cx={252 + i * 230}
            cy={511}
            r={4}
            fill={accent}
            fillOpacity={0.2 + ramp(frame, state.at, DUR.chip) * 0.8}
          />
          <Text x={268 + i * 230} y={516} size={16} fill={STOCK.muted}>
            {state.label}
          </Text>
          {i < states.length - 1 ? (
            <path d={`M${352 + i * 230} 511 h90`} stroke={STOCK.line} />
          ) : null}
        </g>
      ))}
    </g>
  );
}
