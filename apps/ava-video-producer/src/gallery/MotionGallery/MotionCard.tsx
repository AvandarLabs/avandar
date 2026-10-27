import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import { memo } from "react";
import { StockGraphic } from "../../stock/StockGraphic";
import { Icon } from "./Icon";
import { useFrames, useVisible } from "./useGalleryClock";
import type { StockPresetId } from "../../stock/catalog";
import type { ContentDraft } from "./ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "./Preset.types";
export const MotionCard = memo(function MotionCard({
  preset,
  index,
  playing,
  saved,
  onOpen,
  onSave,
  accent,
  background,
  contentState,
}: {
  accent: string;
  background: string;
  contentState?: ContentDraft;
  preset: Preset;
  index: number;
  playing: boolean;
  saved: boolean;
  onOpen: (preset: Preset) => void;
  onSave: (id: StockPresetId) => void;
}) {
  const { t } = useGalleryLingui();
  const [element, visible] = useVisible();
  const [frame] = useFrames(
    playing && visible,
    preset.loopFrames,
    preset.id === "bar-race" ? 150 : 45 + ((index * 7) % 60),
  );
  return (
    <article className="motion-card">
      <button
        ref={element}
        className="card-preview"
        onClick={() => onOpen(preset)}
        aria-label={t`Explore ${preset.name}`}
      >
        {visible ? (
          <StockGraphic
            {...({
              preset: preset.id,
              input: contentState?.resolvedInput,
            } as import("../../stock/contracts/StockContract.types").StockRequest)}
            frame={frame}
            accent={accent}
            background={background}
          />
        ) : (
          <span className="card-still" aria-hidden="true">
            <Icon name="pause" size={24} />
          </span>
        )}
        <span className="preview-open">
          <Icon name="arrow" size={21} />
        </span>
      </button>
      <div className="card-copy">
        <div className="card-category">
          <span>{preset.category}</span>
          <span
            className={`card-state ${playing && visible ? "is-playing" : ""}`}
          >
            <i />
            {playing && visible ? t`LIVE` : t`PAUSED`}
          </span>
        </div>
        <div className="card-heading">
          <button className="card-title" onClick={() => onOpen(preset)}>
            {preset.name}
          </button>
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            onClick={() => onSave(preset.id)}
            aria-label={
              saved
                ? t`Remove ${preset.name} from references`
                : t`Save ${preset.name} to references`
            }
            aria-pressed={saved}
          >
            <Icon name={saved ? "check" : "bookmark"} size={17} />
          </button>
        </div>
        <p>{preset.description}</p>
        <div className="card-foot">
          <code>
            {String(index + 1).padStart(2, "0")}
            <Trans>/</Trans>
            {preset.id}
          </code>
          <button
            onClick={() => onOpen(preset)}
            aria-label={t`View ${preset.name} details`}
          >
            <span>
              <Trans>Explore</Trans>
            </span>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
});
