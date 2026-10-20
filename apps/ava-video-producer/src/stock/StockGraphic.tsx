import { StockBoxRoughnessContext } from "./primitives/StockRect/StockRect";
import { useId } from "react";
import { loopEnvelope } from "../motion";
import { stockRequestEnvelopeSchema } from "./contracts/stockRequestSchema/stockRequestSchema";
import { STOCK } from "./graphics-common";
import { getStockDisplayCopyFromDescriptor } from "./i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { STOCK_GRAPHIC_COPY } from "./i18n/stockGraphicCopy";
import { stockRenderers } from "./registry/stockRenderers/stockRenderers";
import type { StockRequest } from "./contracts/StockContract.types";

/** Preset-discriminated content with explicit local frame and display size. */
export type Props = StockRequest & {
  /** Local frame at 30 fps. The authored loop spans frames 0 through 179. */
  frame: number;
  width?: number;
  height?: number;
  /** Omit the stage ground when compositing the diagram above another surface. */
  transparent?: boolean;
  /** Seeded hand-drawn box outlines, from smooth (0) to expressive (3). */
  boxRoughness?: number;
};

/**
 * Shared browser/video renderer. Pure SVG, explicit frame time, no Remotion
 * dependency. Presets are conceptual illustrations with fictional example data.
 * A fixed viewBox preserves the layout at every display size. Ground remains
 * opaque while the authored 180-frame envelope returns both ends to that ground.
 */
export function StockGraphic({
  preset,
  frame,
  width = 960,
  height = 600,
  accent = STOCK.mint,
  background = STOCK.ground,
  input,
  schemaVersion,
  transparent = false,
  boxRoughness = 0,
}: Props) {
  const id = `stock-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  stockRequestEnvelopeSchema.parse({
    preset,
    schemaVersion,
    accent,
    background,
  });
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
        values: {
          preset: preset.replaceAll("-", " "),
        },
      })}
      style={{ display: "block", background: transparent ? "transparent" : background, fontFamily: "Arial, sans-serif" }}
    >
      {!transparent && <rect width={960} height={600} fill={background} />}
      <StockBoxRoughnessContext.Provider value={boxRoughness}>
      <g opacity={loopEnvelope(localFrame, 180)}>
        {stockRenderers[preset](
          { frame: localFrame, accent, background, id },
          input,
        )}
      </g>
      </StockBoxRoughnessContext.Provider>
    </svg>
  );
}
