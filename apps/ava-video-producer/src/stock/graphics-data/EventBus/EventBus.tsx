import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BusPackets } from "./BusPackets";
import { BusProducer } from "./BusProducer";
import { BusSubscriber } from "./BusSubscriber";
import { BusTrack } from "./BusTrack";
import type { Props } from "./EventBus.types";
import type { ReactNode } from "react";

/** Renders EventBus within the authored stock graphics. */
export function EventBus({ input, frame, accent }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, alpha, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const producers = input.producers;
  const subscribers = input.subscribers;
  return (
    <g>
      <BusTrack {...{ input, accent, atomic, stroke, shapes }} />
      <BusPackets
        {...{
          input,
          frame,
          accent,
          stroke,
          alpha,
          sketch,
          shapes,
        }}
      />
      {producers.map((name, i) => {
        return (
          <BusProducer
            key={name}
            {...{ input, frame, color, alpha, name, i }}
          />
        );
      })}
      {subscribers.map((name, i) => {
        return (
          <BusSubscriber
            key={name}
            {...{ input, frame, atomic, color, name, i }}
          />
        );
      })}
    </g>
  );
}
