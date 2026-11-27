import { StockGraphic } from "../../../../stock/StockGraphic/StockGraphic";
import { VideoTokenUsageContext } from "../../../../videoTheme/TokenUsage/TokenUsage";
import { GalleryItemTheme } from "../../../GalleryVideoTheme/GalleryItemTheme";
import css from "./PreviewMotionCanvas.module.css";
import type { StockRequest } from "../../../../stock/contracts/StockContract.types";
import type { useObservedTokenUsage } from "../../../../videoThemeEditor/createObservedTokenUsage/useObservedTokenUsage";
import type { ContentDraft } from "../../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../../Preset.types";
import type { ReactNode } from "react";

type Props = {
  preset: Preset;
  contentState: ContentDraft;
  frame: number;
  usage: ReturnType<typeof useObservedTokenUsage>;
};
/**
 * Draws the selected motion and reports token usage for PreviewDialogContent.
 */
export function PreviewMotionCanvas({
  preset,
  contentState,
  frame,
  usage,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.previewMotionCanvasDialogStage}>
      <div className={css.previewMotionCanvasDialogCanvas}>
        <GalleryItemTheme itemId={preset.id}>
          <VideoTokenUsageContext.Provider value={usage.report}>
            <StockGraphic
              {...({
                preset: preset.id,
                input: contentState.resolvedInput,
              } as StockRequest)}
              frame={frame}
            />
          </VideoTokenUsageContext.Provider>
        </GalleryItemTheme>
      </div>
    </div>
  );
}
