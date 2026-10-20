import { MantineProvider, Checkbox } from "@mantine/core";
import "@mantine/core/styles.layer.css";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import { CameraPresetControl } from "./CameraPresetControl";
import { CompositionRoughnessControls } from "./CompositionRoughnessControls";
import { Trans, useLingui } from "@lingui/react/macro";
import { PaletteControls } from "../../../gallery/MotionGallery/PaletteControls";
import type { useCompositionAppearance } from "./useCompositionAppearance";
import css from "./CompositionControls.module.css";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };
/** Shared Atlas palette and transport controls for the active composition. */
export function CompositionControls({ appearance }: Props) {
  return (
    <MantineProvider
      theme={{ fontFamily: "Inter, Helvetica Neue, Arial, sans-serif" }}
    >
      <div className={css.controls}>
        <PaletteControls
          accent={appearance.draft.accent}
          background={appearance.draft.background}
          setAccent={(accent) => appearance.update({ accent })}
          setBackground={(background) => appearance.update({ background })}
        />
        <p className={css.help}>
          <Trans>
            Colors affect editorial graphics. Product components retain their
            native theme.
          </Trans>
        </p>
        <TransportControls appearance={appearance} />
      </div>
    </MantineProvider>
  );
}

function TransportControls({ appearance }: Props) {
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
      <AppearanceToggles appearance={appearance} />
      <CameraPresetControl appearance={appearance} />
      <CompositionRoughnessControls appearance={appearance} />
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
