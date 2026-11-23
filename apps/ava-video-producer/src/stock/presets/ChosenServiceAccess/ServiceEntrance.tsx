import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ServiceChoiceLabel } from "./ServiceChoiceLabel/ServiceChoiceLabel";
import { ServiceDoorFrame } from "./ServiceDoorFrame/ServiceDoorFrame";
import { ServiceEntranceLabel } from "./ServiceEntranceLabel/ServiceEntranceLabel";
import { ServiceEntranceSymbol } from "./ServiceEntranceSymbol/ServiceEntranceSymbol";
import { ServiceThresholdBarrier } from "./ServiceThresholdBarrier/ServiceThresholdBarrier";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = {
  service: Input["services"][number];
  input: Input;
  index: number;
  frame: number;
  accent: string;
};
/** The selected service alone unfolds a ramp or rolls an obstruction clear. */
export function ServiceEntrance({
  service,
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = 160 + ((index + 0.5) * 640) / input.services.length;
  const selected = service.id === input.chosenServiceId;
  const change = selected
    ? motion.ramp(frame, 44, motion.scale(32), motion.travel.easing)
    : 0;
  const threshold = input.accessChange === "clear-entrance" ? 356 : 326;
  const barrier =
    input.accessChange === "unfold-ramp"
      ? `M${x - 42} 326 L${x - 42 - 58 * change} ${Motion.mix({ t: change, from: 246, to: 356 })}`
      : `M${x - 30 + change * 94} 356 h60 v-38 h-60 Z`;
  return (
    <g>
      <ServiceEntranceLabel {...{ service, input, x }} />
      <ServiceDoorFrame
        {...{ service, accent, tokens, scales, x, selected, change }}
        threshold={threshold}
      />
      <ServiceThresholdBarrier
        {...{ service, input, accent, tokens, scales, x, selected }}
        barrier={barrier}
      />
      <ServiceEntranceSymbol {...{ service, x, tokens }} />
      <ServiceChoiceLabel {...{ input, frame, x, selected }} />
    </g>
  );
}
