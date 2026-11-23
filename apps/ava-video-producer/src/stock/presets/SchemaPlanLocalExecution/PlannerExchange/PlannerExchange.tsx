import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PlannerExchangeInbound } from "./PlannerExchangeInbound";
import { PlannerExchangeRoutes } from "./PlannerExchangeRoutes";
import { QuestionAndColumnLabels } from "./QuestionAndColumnLabels";
import type { Input } from "../SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

type OutboundXAndInboundXOptions = {
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type OutboundXAndInboundXResult = {
  outboundX: number;
  inboundX: number;
};

/**
 * Samples the planner exchange outbound xand inbound x for the current authored
 * frame.
 */
function _getPlannerExchangeOutboundXAndInboundX({
  frame,
  motion,
}: Readonly<OutboundXAndInboundXOptions>): OutboundXAndInboundXResult {
  const sending = motion.ramp(
    frame,
    13,
    motion.scale(30),
    motion.travel.easing,
  );
  const returning = motion.ramp(
    frame,
    56,
    motion.scale(44),
    motion.travel.easing,
  );
  const outboundX = Motion.mix({
    t: sending,
    from: 55,
    to: 630,
  });
  const inboundX = Motion.mix({
    t: returning,
    from: 630,
    to: 60,
  });
  return { outboundX, inboundX };
}

/**
 * Only explicitly supplied question/schema copy leaves; the authored plan
 * returns.
 */
export function PlannerExchange({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { outboundX, inboundX } = _getPlannerExchangeOutboundXAndInboundX({
    frame,
    motion,
  });
  return (
    <g>
      <PlannerExchangeRoutes accent={accent} tokens={tokens} scales={scales} />
      <g
        data-outbound="true"
        transform={`translate(${outboundX} ${Motion.mix({
          t: motion.ramp(frame, 43, motion.scale(12), motion.travel.easing),
          from: 108,
          to: 340,
        })})`}
      >
        <QuestionAndColumnLabels
          input={input}
          tokens={tokens}
          scales={scales}
        />
      </g>
      <PlannerExchangeInbound
        input={input}
        frame={frame}
        accent={accent}
        tokens={tokens}
        scales={scales}
        inboundX={inboundX}
      />
    </g>
  );
}
