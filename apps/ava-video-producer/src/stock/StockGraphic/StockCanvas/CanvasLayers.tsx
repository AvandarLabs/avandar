import { VideoEffectDefs } from "../../../videoTheme/VideoEffectDefs/VideoEffectDefs";
import { VideoEffectFilters } from "../../../videoTheme/VideoEffectFilters/VideoEffectFilters";
import { stockRenderers } from "../../registry/stockRenderers/stockRenderers";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GroundFill } from "../GroundFill";
import type { Props as StockGraphicProps } from "../StockGraphic";
import type { ReactNode } from "react";

type ParentProps = Omit<
  StockGraphicProps,
  "accent" | "background" | "schemaVersion"
> & { id: string };

type Props = {
  preset: ParentProps["preset"];
  input: ParentProps["input"];
  transparent: ParentProps["transparent"];
  id: ParentProps["id"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  theme: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  localFrame: number;
};

/** Renders the canvas layers in authored paint order. */
export function CanvasLayers(options: Readonly<Props>): ReactNode {
  return (
    <>
      <VideoEffectDefs
        graphicId={options.id}
        filters={VideoEffectFilters.listVideoEffectFilters(options.theme)}
      />
      {options.transparent ? null : <GroundFill id={options.id} />}
      <GraphicThemeHooks.GraphicIdContext.Provider value={options.id}>
        <g opacity={options.motion.loopEnvelope(options.localFrame, 180)}>
          {stockRenderers[options.preset](
            {
              frame: options.localFrame,
              accent: options.tokens.color.accent,
              background: options.tokens.color.ground,
              id: options.id,
            },
            options.input,
          )}
        </g>
      </GraphicThemeHooks.GraphicIdContext.Provider>
    </>
  );
}
