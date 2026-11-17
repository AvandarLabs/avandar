import { Checkbox } from "@mantine/core";
import { AtlasChromeProvider } from "../../../gallery/AtlasLayout/AtlasChromeProvider";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import css from "./CompositionControls.module.css";
import type { useCompositionAppearance } from "./useCompositionAppearance";

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
export function CompositionControls({ appearance, isScene }: ControlsProps) {
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
      <button onClick={() => appearance.send("play")}>Play</button>
      <button onClick={() => appearance.send("pause")}>Pause</button>
      <button onClick={() => appearance.send("replay")}>Replay</button>
      <AtlasSelect
        label="Speed"
        value={String(appearance.transport.speed)}
        data={[0.5, 1, 1.5, 2].map((speed) => ({
          value: String(speed),
          label: `${speed}×`,
        }))}
        onChange={(speed) =>
          appearance.setTransport((current) => ({
            ...current,
            speed: Number(speed),
          }))
        }
      />
      <Checkbox
        size="xs"
        label="Loop"
        checked={appearance.transport.loop}
        onChange={(event) => {
          const loop = event.currentTarget.checked;
          appearance.setTransport((current) => ({ ...current, loop }));
        }}
      />
      {isScene ? null : <AppearanceToggles appearance={appearance} />}
    </div>
  );
}

const APPEARANCE_LABELS = {
  cameraMotion: "Camera motion",
  motionBlur: "Motion blur",
  annotations: "Annotations",
  captions: "Captions",
} as const;

function AppearanceToggles({ appearance }: Props) {
  return (
    <>
      {(["cameraMotion", "motionBlur", "annotations", "captions"] as const).map(
        (key) => (
          <Checkbox
            key={key}
            size="xs"
            label={APPEARANCE_LABELS[key]}
            checked={appearance.draft[key]}
            onChange={(event) =>
              appearance.update({ [key]: event.currentTarget.checked })
            }
          />
        ),
      )}
    </>
  );
}
