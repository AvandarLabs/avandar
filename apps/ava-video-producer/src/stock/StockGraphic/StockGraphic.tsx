import { useId } from "react";
import { makeThemePatchFromStockColors } from "../../videoTheme/makeThemePatchFromStockColors/makeThemePatchFromStockColors";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { stockRequestEnvelopeSchema } from "../contracts/stockRequestSchema/stockRequestSchema";
import { StockCanvas } from "./StockCanvas/StockCanvas";
import type { StockRequest } from "../contracts/StockContract.types";
import type { ReactNode } from "react";

/** Preset-discriminated content with explicit local frame and display size. */
export type Props = StockRequest & {
  /** Local frame at 30 fps. The authored loop spans frames 0 through 179. */
  frame: number;
  width?: number;
  height?: number;
  /**
   * Omit the stage ground when compositing the diagram above another surface.
   */
  transparent?: boolean;
};

/**
 * Shared browser/video renderer. Pure SVG, explicit frame time, no Remotion
 * dependency. Presets are conceptual illustrations with fictional example data.
 * The graphic draws inside the surrounding video theme (classic when there is
 * none) plus its preset's override; explicit `accent` and `background` props
 * are content and win over both. A fixed viewBox preserves the layout at every
 * display size, and the authored 180-frame envelope returns both loop ends to
 * the ground.
 */
export function StockGraphic({
  accent,
  background,
  schemaVersion,
  ...canvas
}: Props): ReactNode {
  const id = `stock-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  stockRequestEnvelopeSchema.parse({
    preset: canvas.preset,
    schemaVersion,
    accent,
    background,
  });
  const patches =
    accent || background
      ? [makeThemePatchFromStockColors({ accent, background })]
      : [];
  return (
    <VideoThemeScope overrideIds={[canvas.preset]} patches={patches}>
      <StockCanvas {...canvas} id={id} />
    </VideoThemeScope>
  );
}
