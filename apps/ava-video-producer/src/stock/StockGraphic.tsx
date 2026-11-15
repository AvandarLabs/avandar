import { useId } from "react";
import { loopEnvelope } from "../motion";
import { createThemePatchFromStockColors } from "../videoTheme/createThemePatchFromStockColors/createThemePatchFromStockColors";
import { fillToCss } from "../videoTheme/cssValueHelpers/cssValueHelpers";
import { VideoEffectDefs } from "../videoTheme/VideoEffectDefs/VideoEffectDefs";
import { listVideoEffectFilters } from "../videoTheme/videoEffectFilterHelpers/videoEffectFilterHelpers";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import { stockRequestEnvelopeSchema } from "./contracts/stockRequestSchema/stockRequestSchema";
import { getStockDisplayCopyFromDescriptor } from "./copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { STOCK_GRAPHIC_COPY } from "./copy/stockGraphicCopy";
import { stockRenderers } from "./registry/stockRenderers/stockRenderers";
import {
  GraphicIdContext,
  useGraphicTheme,
  useGraphicTokens,
} from "./theme/useGraphicTheme";
import type { StockRequest } from "./contracts/StockContract.types";

/** Preset-discriminated content with explicit local frame and display size. */
export type Props = StockRequest & {
  /** Local frame at 30 fps. The authored loop spans frames 0 through 179. */
  frame: number;
  width?: number;
  height?: number;
  /** Omit the stage ground when compositing the diagram above another surface. */
  transparent?: boolean;
};

type CanvasProps = Omit<Props, "accent" | "background" | "schemaVersion"> & {
  id: string;
};

function GroundFill({ id }: { id: string }) {
  const { color } = useGraphicTokens();
  const fill = color.groundFill;
  if (fill.type === "solid") {
    return <rect width={960} height={600} fill={fill.color} />;
  }
  return (
    <>
      <defs>
        <linearGradient
          id={`${id}-ground`}
          gradientTransform={`rotate(${fill.deg - 90} 0.5 0.5)`}
        >
          <stop offset="0" stopColor={fill.from} />
          <stop offset="1" stopColor={fill.to} />
        </linearGradient>
      </defs>
      <rect width={960} height={600} fill={`url(#${id}-ground)`} />
    </>
  );
}

function StockCanvas({
  preset,
  frame,
  width = 960,
  height = 600,
  input,
  transparent = false,
  id,
}: CanvasProps) {
  const tokens = useGraphicTokens();
  const theme = useGraphicTheme();
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
      {!transparent && <GroundFill id={id} />}
      <GraphicIdContext.Provider value={id}>
        <g opacity={loopEnvelope(localFrame, 180)}>
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
      </GraphicIdContext.Provider>
    </svg>
  );
}

/**
 * Shared browser/video renderer. Pure SVG, explicit frame time, no Remotion
 * dependency. Presets are conceptual illustrations with fictional example
 * data. The graphic draws inside the surrounding video theme (classic when
 * there is none) plus its preset's override; explicit `accent` and
 * `background` props are content and win over both. A fixed viewBox
 * preserves the layout at every display size, and the authored 180-frame
 * envelope returns both loop ends to the ground.
 */
export function StockGraphic({
  accent,
  background,
  schemaVersion,
  ...canvas
}: Props) {
  const id = `stock-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  stockRequestEnvelopeSchema.parse({
    preset: canvas.preset,
    schemaVersion,
    accent,
    background,
  });
  const patches =
    accent || background
      ? [createThemePatchFromStockColors({ accent, background })]
      : [];
  return (
    <VideoThemeScope overrideIds={[canvas.preset]} patches={patches}>
      <StockCanvas {...canvas} id={id} />
    </VideoThemeScope>
  );
}
