import { Checkbox } from "@mantine/core";
import { AtlasChromeProvider } from "../../../../gallery/AtlasLayout/AtlasChromeProvider";
import { AtlasSelect } from "../../../../gallery/AtlasSelect/AtlasSelect";
import css from "./CompositionControls.module.css";
import type { useCompositionAppearance } from "../useCompositionAppearance";
import type { ReactNode } from "react";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };
type ControlsProps = Props & {
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
}: ControlsProps): ReactNode {
  return (
    <AtlasChromeProvider>
      <div className={css.controls}>
        {isScene ? (
          <p className={css.help}>
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

function TransportControls({ appearance, isScene }: ControlsProps) {
  return (
    <div className={css.transport}>
      <button
        onClick={() => {
          return appearance.send("play");
        }}
      >
        Play
      </button>
      <button
        onClick={() => {
          return appearance.send("pause");
        }}
      >
        Pause
      </button>
      <button
        onClick={() => {
          return appearance.send("replay");
        }}
      >
        Replay
      </button>
      <AtlasSelect
        label="Speed"
        value={String(appearance.transport.speed)}
        data={[0.5, 1, 1.5, 2].map((speed) => {
          return { value: String(speed), label: `${speed}×` };
        })}
        onChange={(speed) => {
          return appearance.setTransport((current) => {
            return { ...current, speed: Number(speed) };
          });
        }}
      />
      <Checkbox
        size="xs"
        label="Loop"
        checked={appearance.transport.loop}
        onChange={(event) => {
          const loop = event.currentTarget.checked;
          appearance.setTransport((current) => {
            return { ...current, loop };
          });
        }}
      />
      {isScene ? null : <AppearanceToggles appearance={appearance} />}
    </div>
  );
}

function AppearanceToggles({ appearance }: Props) {
  const labels = {
    cameraMotion: "Camera motion",
    motionBlur: "Motion blur",
    annotations: "Annotations",
    captions: "Captions",
  };
  return (
    <>
      {(["cameraMotion", "motionBlur", "annotations", "captions"] as const).map(
        (key) => {
          return (
            <Checkbox
              key={key}
              size="xs"
              label={labels[key]}
              checked={appearance.draft[key]}
              onChange={(event) => {
                return appearance.update({
                  [key]: event.currentTarget.checked,
                });
              }}
            />
          );
        },
      )}
    </>
  );
}
