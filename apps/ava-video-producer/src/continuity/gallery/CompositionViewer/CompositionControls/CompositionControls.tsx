import { AtlasChromeProvider } from "../../../../gallery/AtlasLayout/AtlasChromeProvider";
import css from "./CompositionControls.module.css";
import { TransportControls } from "./TransportControls/TransportControls";
import type { useCompositionAppearance } from "../useCompositionAppearance/useCompositionAppearance";
import type { ReactNode } from "react";

type Props = {
  appearance: ReturnType<typeof useCompositionAppearance>;
  /** A scene study plays plain storyboard scenes with its authored theme. */
  isScene: boolean;
};

/**
 * Transport and render toggles for the active composition. Colours, sketch
 * levels, and camera presets are design tokens, edited in the Design tokens
 * tab. Scene studies keep only playback.
 */
export function CompositionControls({
  appearance,
  isScene,
}: Readonly<Props>): ReactNode {
  return (
    <AtlasChromeProvider>
      <div className={css.compositionControlsControls}>
        {isScene ? (
          <p className={css.compositionControlsHelp}>
            Storyboard scenes play with their authored theme and per-shot field
            colors. Design tokens, camera motion, motion blur, and annotation
            settings apply to continuity compositions only.
          </p>
        ) : null}
        <TransportControls appearance={appearance} isScene={isScene} />
      </div>
    </AtlasChromeProvider>
  );
}
