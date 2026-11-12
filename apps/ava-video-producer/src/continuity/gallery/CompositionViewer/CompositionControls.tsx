import { Trans, useLingui } from "@lingui/react/macro";
import "@mantine/core/styles.layer.css";
import { MantineProvider, Checkbox } from "@mantine/core";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import { PaletteControls } from "../../../gallery/MotionGallery/PaletteControls";
import { CameraPresetControl } from "./CameraPresetControl";
import css from "./CompositionControls.module.css";
import { CompositionRoughnessControls } from "./CompositionRoughnessControls";
import type { useCompositionAppearance } from "./useCompositionAppearance";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };
type ControlsProps = Props & {
  /** A scene study plays plain storyboard scenes with its authored theme. */
  isScene: boolean;
};

/**
 * Shared Atlas palette and transport controls for the active composition.
 * Scene studies keep only playback: palette, camera, blur, annotation,
 * roughness and caption settings change nothing in plain storyboard scenes.
 */
export function CompositionControls({ appearance, isScene }: ControlsProps) {
  return (
    <MantineProvider
      theme={{ fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className={css.controls}>
        {isScene ? (
          <p className={css.help}>
            <Trans>
              Storyboard scenes play with their authored theme and per-shot
              field colors. Palette, camera, motion blur, annotation and
              roughness settings apply to continuity compositions only.
            </Trans>
          </p>
        ) : (
          <>
            <PaletteControls
              accent={appearance.draft.accent}
              background={appearance.draft.background}
              setAccent={(accent) => appearance.update({ accent })}
              setBackground={(background) => appearance.update({ background })}
            />
            <p className={css.help}>
              <Trans>
                Colors affect editorial graphics. Product components retain
                their native theme.
              </Trans>
            </p>
          </>
        )}
        <TransportControls appearance={appearance} isScene={isScene} />
      </div>
    </MantineProvider>
  );
}

function TransportControls({ appearance, isScene }: ControlsProps) {
  const { t } = useLingui();
  return (
    <div className={css.transport}>
      <button onClick={() => appearance.send("play")}>
        <Trans>Play</Trans>
      </button>
      <button onClick={() => appearance.send("pause")}>
        <Trans>Pause</Trans>
      </button>
      <button onClick={() => appearance.send("replay")}>
        <Trans>Replay</Trans>
      </button>
      <AtlasSelect
        label={t`Speed`}
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
        label={t`Loop`}
        checked={appearance.transport.loop}
        onChange={(event) => {
          const loop = event.currentTarget.checked;
          appearance.setTransport((current) => ({ ...current, loop }));
        }}
      />
      {!isScene && (
        <>
          <AppearanceToggles appearance={appearance} />
          <CameraPresetControl appearance={appearance} />
          <CompositionRoughnessControls appearance={appearance} />
        </>
      )}
    </div>
  );
}

function AppearanceToggles({ appearance }: Props) {
  const { t } = useLingui();
  const labels = {
    cameraMotion: t`Camera motion`,
    motionBlur: t`Motion blur`,
    annotations: t`Annotations`,
    captions: t`Captions`,
  };
  return (
    <>
      {(["cameraMotion", "motionBlur", "annotations", "captions"] as const).map(
        (key) => (
          <Checkbox
            key={key}
            size="xs"
            label={labels[key]}
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
