import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox } from "@mantine/core";
import { AtlasChromeProvider } from "../../../gallery/AtlasLayout/AtlasChromeProvider/AtlasChromeProvider";
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
            <Trans>
              Storyboard scenes play with their authored theme and per-shot
              field colors. Design tokens, camera motion, motion blur, and
              annotation settings apply to continuity compositions only.
            </Trans>
          </p>
        ) : null}
        <TransportControls appearance={appearance} isScene={isScene} />
      </div>
    </AtlasChromeProvider>
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
      {isScene ? null : <AppearanceToggles appearance={appearance} />}
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
