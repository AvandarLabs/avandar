import { fillToCss } from "../../videoTheme/cssValueHelpers/cssValueHelpers";
import { VideoEffectDefs } from "../../videoTheme/VideoEffectDefs/VideoEffectDefs";
import { listVideoEffectFilters } from "../../videoTheme/videoEffectFilterHelpers/videoEffectFilterHelpers";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { STOCK_GRAPHIC_COPY } from "../copy/stockGraphicCopy";
import { stockRenderers } from "../registry/stockRenderers/stockRenderers";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GroundFill } from "./GroundFill";
import type { Props as StockGraphicProps } from "./StockGraphic";
import type { ReactNode } from "react";

type Props = Omit<
  StockGraphicProps,
  "accent" | "background" | "schemaVersion"
> & { id: string };
/**
 * The stock graphic's svg: its ground, effect definitions, and the preset
 * renderer at the clamped frame, faded from and back to the ground over the
 * theme's graphic loop fade.
 */
export function StockCanvas({
  preset,
  frame,
  width = 960,
  height = 600,
  input,
  transparent = false,
  id,
}: Props): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const theme = GraphicThemeHooks.useGraphicTheme();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const localFrame = Math.max(
    0,
    Math.min(179, Number.isFinite(frame) ? frame : 0),
  );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 960 600"
      role="img"
      aria-label={getStockDisplayCopyFromDescriptor({
        descriptor: STOCK_GRAPHIC_COPY,
        values: { preset: preset.replaceAll("-", " ") },
      })}
      style={{
        display: "block",
        background: transparent
          ? "transparent"
          : fillToCss(tokens.color.groundFill),
        fontFamily: tokens.text.graphic.body.fontFamily,
      }}
    >
      <VideoEffectDefs graphicId={id} filters={listVideoEffectFilters(theme)} />
      {transparent ? null : <GroundFill id={id} />}
      <GraphicThemeHooks.GraphicIdContext.Provider value={id}>
        <g opacity={motion.loopEnvelope(localFrame, 180)}>
          {stockRenderers[preset](
            {
              frame: localFrame,
              accent: tokens.color.accent,
              background: tokens.color.ground,
              id,
            },
            input,
          )}
        </g>
      </GraphicThemeHooks.GraphicIdContext.Provider>
    </svg>
  );
}
