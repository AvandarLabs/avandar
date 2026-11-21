import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { EventBusInput } from "../../presets/EventBus/EventBus.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within EventBus. */
export type Props = GraphicProps & { input: EventBusInput };
/** Rendering data shared within EventBus. */
export type ProducerConnectionData = {
  input: Props["input"];
  frame: Props["frame"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  name: Props["input"]["producers"][number];
  i: number;
  x: number;
  center: number;
  to: { x: number; y: number };
  from: { x: number; y: number };
};
/** Rendering data shared within EventBus. */
export type SubscriberConnectionData = {
  input: Props["input"];
  frame: Props["frame"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  name: Props["input"]["subscribers"][number];
  i: number;
  x: number;
  center: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
};
/** Rendering data shared within EventBus. */
export type BusPacketsData = {
  input: Props["input"];
  frame: Props["frame"];
  accent: Props["accent"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Rendering data shared within EventBus. */
export type BusTrackData = {
  input: Props["input"];
  accent: Props["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Rendering data shared within EventBus. */
export type ProducerOrdinalData = { i: number; center: number };
/** Rendering data shared within EventBus. */
export type SubscriberOrdinalData = { i: number; center: number };
/** Rendering data shared within EventBus. */
export type BusProducerData = {
  input: Props["input"];
  frame: Props["frame"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  name: Props["input"]["producers"][number];
  i: number;
};
/** Rendering data shared within EventBus. */
export type BusSubscriberData = {
  input: Props["input"];
  frame: Props["frame"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  name: Props["input"]["subscribers"][number];
  i: number;
};
