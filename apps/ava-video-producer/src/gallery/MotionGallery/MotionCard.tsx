import { memo } from "react";
import type { StockPresetId } from "../../stock/catalog";
import { StockGraphic } from "../../stock/StockGraphic";
import { Icon } from "./Icon";
import type { Preset } from "./shared";
import { useFrames, useVisible } from "./useGalleryClock";

export const MotionCard = memo(function MotionCard({
  preset,
  index,
  playing,
  saved,
  onOpen,
  onSave,
  accent,
  background,
}: {
  accent: string;
  background: string;
  preset: Preset;
  index: number;
  playing: boolean;
  saved: boolean;
  onOpen: (preset: Preset) => void;
  onSave: (id: StockPresetId) => void;
}) {
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
        aria-label={`Explore ${preset.name}`}
      >
        <StockGraphic
          preset={preset.id}
          frame={frame}
          accent={accent}
          background={background}
        />
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
            {playing && visible ? "LIVE" : "PAUSED"}
          </span>
        </div>
        <div className="card-heading">
          <button className="card-title" onClick={() => onOpen(preset)}>
            {preset.name}
          </button>
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            onClick={() => onSave(preset.id)}
            aria-label={`${saved ? "Remove" : "Save"} ${preset.name} ${saved ? "from" : "to"} references`}
            aria-pressed={saved}
          >
            <Icon name={saved ? "check" : "bookmark"} size={17} />
          </button>
        </div>
        <p>{preset.description}</p>
        <div className="card-foot">
          <code>
            {String(index + 1).padStart(2, "0")} / {preset.id}
          </code>
          <button
            onClick={() => onOpen(preset)}
            aria-label={`View ${preset.name} details`}
          >
            <span>Explore</span>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
});
