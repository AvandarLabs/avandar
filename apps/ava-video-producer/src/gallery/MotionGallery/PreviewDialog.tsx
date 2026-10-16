import React, { useEffect, useRef, useState } from "react";
import { downloadFilm } from "../../../showcase/download.js";
import { StockGraphic } from "../../stock/StockGraphic";
import { Icon } from "./Icon";
import { PaletteControls, type Props as PaletteProps } from "./PaletteControls";
import {
  reduceMotion,
  referenceBrief,
  referenceUrl,
  type Preset,
} from "./shared";
import { useFrames } from "./useGalleryClock";
import type { StockPresetId } from "../../stock/catalog";

function trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function PreviewDialog({
  preset,
  saved,
  initialPlaying,
  onClose,
  onSave,
  onCopy,
  notice,
  accent,
  background,
  setAccent,
  setBackground,
}: PaletteProps & {
  preset: Preset;
  saved: boolean;
  initialPlaying: boolean;
  onClose: () => void;
  onSave: (id: StockPresetId) => void;
  onCopy: (text: string, label: string) => void;
  notice: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const download = async () => {
    setExporting(true);
    try {
      await downloadFilm({
        id: `stock-${preset.id}`,
        options: { accent, background },
        onStatus: (status) => setExportStatus(status.message),
      });
    } catch (error) {
      setExportStatus(
        error instanceof Error ? error.message : "Export failed. Try again.",
      );
    } finally {
      setExporting(false);
    }
  };
  const [playing, setPlaying] = useState(initialPlaying && !reduceMotion());
  const [frame, setFrame] = useFrames(playing, preset.loopFrames);
  useEffect(function pauseOnReducedMotionPreference() {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForPreference = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener("change", pauseForPreference);
    return () => preference.removeEventListener("change", pauseForPreference);
  }, []);
  useEffect(function lockPageAndOpenDialog() {
    const node = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node?.showModal();
    return () => {
      node?.close();
      document.body.style.overflow = priorOverflow;
      focused?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="preview-dialog"
      ref={dialog}
      onKeyDown={trapDialogFocus}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-header">
        <div className="dialog-heading">
          <h2 id="dialog-title">{preset.name}</h2>
          <span>{preset.category}</span>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close preview"
          autoFocus
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="dialog-layout">
        <div className="dialog-player">
          <div className="dialog-stage">
            <div className="dialog-canvas">
              <StockGraphic
                preset={preset.id}
                frame={frame}
                accent={accent}
                background={background}
              />
            </div>
          </div>
          <div className="player-controls">
            <div className="transport-row">
              <button
                className="transport-button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "Pause preview" : "Play preview"}
              >
                <Icon name={playing ? "pause" : "play"} size={17} />
                <span>{playing ? "Pause" : "Play"}</span>
              </button>
              <button
                className="icon-button"
                onClick={() => setFrame(0)}
                aria-label="Restart preview"
              >
                <Icon name="restart" size={17} />
              </button>
              <output
                className="time-code"
                aria-label="Current time"
                aria-live="off"
              >
                {(frame / 30).toFixed(2)}{" "}
                <span>/ {(preset.loopFrames / 30).toFixed(2)} s</span>
              </output>
              <span className="frame-rate">30 FPS</span>
            </div>
            <label className="sr-only" htmlFor="frame-scrubber">
              Preview frame
            </label>
            <input
              id="frame-scrubber"
              className="frame-scrubber"
              type="range"
              min={0}
              max={preset.loopFrames - 1}
              value={frame}
              aria-valuetext={`Frame ${frame} of ${preset.loopFrames - 1}`}
              onChange={(event) => {
                setPlaying(false);
                setFrame(Number(event.target.value));
              }}
            />
            <div className="scrubber-labels">
              <span>FRAME {String(frame).padStart(3, "0")}</span>
              <span>DRAG TO EXPLORE</span>
              <span>{preset.loopFrames} FRAMES</span>
            </div>
          </div>
        </div>
        <div className="dialog-details">
          <p className="dialog-description" id="dialog-description">
            {preset.description}
          </p>
          <PaletteControls
            accent={accent}
            background={background}
            setAccent={setAccent}
            setBackground={setBackground}
          />
          <div className="detail-section">
            <h3>Good for</h3>
            <p>{preset.useWhen}</p>
          </div>
          <div className="keyword-list" aria-label="Keywords">
            {preset.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="brief-excerpt">
            <h3>Creative direction</h3>
            <p>{preset.prompt}</p>
          </div>
          <div className="dialog-actions">
            <button
              className="button button-primary"
              onClick={() =>
                onCopy(
                  referenceBrief(preset, accent, background),
                  "Creative brief copied",
                )
              }
            >
              <Icon name="copy" size={16} />
              Copy creative brief
            </button>
            <button
              className={`button ${saved ? "button-saved" : ""}`}
              onClick={() => onSave(preset.id)}
              aria-pressed={saved}
            >
              <Icon name={saved ? "check" : "bookmark"} size={16} />
              {saved ? "Saved to references" : "Save reference"}
            </button>
          </div>
          <div className="detail-links">
            <button
              onClick={() =>
                onCopy(
                  `${preset.name} (${preset.id})\n${referenceUrl(preset)}`,
                  "Reference link copied",
                )
              }
            >
              <Icon name="copy" size={14} />
              Copy link
            </button>
            <button onClick={download} disabled={exporting}>
              <Icon name="download" size={14} />
              {exporting ? "Rendering MP4…" : "Download MP4"}
            </button>
          </div>
          <p className="dialog-notice" role="status" aria-live="polite">
            {exportStatus ||
              notice ||
              "Conceptual graphics. No Avandar product footage."}
          </p>
        </div>
      </div>
    </dialog>
  );
}
