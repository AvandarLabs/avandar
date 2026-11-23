import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { PacketStreamInput } from "../../presets/PacketStream/PacketStream.schema";
import type { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within PacketStream. */
export type Props = GraphicProps & { input: PacketStreamInput };
/** Rendering data shared within PacketStream. */
export type Drawing = Props & {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  hairline: number;
};
/** Rendering data shared within PacketStream. */
export type LaneTrackData = Drawing & {
  lane: PacketStreamInput["lanes"][number] & { y: number };
  laneColor: ReturnType<typeof getContentColorFromValue>;
};
