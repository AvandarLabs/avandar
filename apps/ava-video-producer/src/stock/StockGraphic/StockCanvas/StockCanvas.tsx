import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CanvasLayers } from "./CanvasLayers";
import { STOCK_GRAPHIC_COPY } from "./StockCanvas.constants";
import type { Props as StockGraphicProps } from "../StockGraphic";
import type { ReactNode } from "react";

type Props = Omit<
  StockGraphicProps,
  "accent" | "background" | "schemaVersion"
> & { id: string };

type GetCanvasStyleOptions = {
  transparent: Props["transparent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Samples the canvas style for the current authored frame. */
function _getCanvasStyle({
  transparent,
  tokens,
}: Readonly<GetCanvasStyleOptions>): {
  display: string;
  background: string | ReturnType<typeof VideoCssValues.makeCssFromFill>;
  fontFamily: ReturnType<
    typeof GraphicThemeHooks.useGraphicTokens
  >["text"]["graphic"]["body"]["fontFamily"];
} {
  return {
    display: "block",
    background: transparent
      ? "transparent"
      : VideoCssValues.makeCssFromFill(tokens.color.groundFill),
    fontFamily: tokens.text.graphic.body.fontFamily,
  };
}

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
      style={_getCanvasStyle({ transparent, tokens })}
    >
      <CanvasLayers
        preset={preset}
        input={input}
        transparent={transparent}
        id={id}
        tokens={tokens}
        theme={theme}
        motion={motion}
        localFrame={localFrame}
      />
    </svg>
  );
}
