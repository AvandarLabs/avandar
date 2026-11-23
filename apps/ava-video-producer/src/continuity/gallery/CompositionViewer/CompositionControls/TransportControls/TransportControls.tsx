import { Checkbox } from "@mantine/core";
import { AtlasSelect } from "../../../../../gallery/AtlasSelect/AtlasSelect";
import { AppearanceToggles } from "./AppearanceToggles";
import { TransportButtons } from "./TransportButtons";
import css from "./TransportControls.module.css";
import type { useCompositionAppearance } from "../../useCompositionAppearance/useCompositionAppearance";
import type { ReactNode } from "react";

type Props = {
  appearance: ReturnType<typeof useCompositionAppearance>;
  isScene: boolean;
};
/**
 * Present playback speed, looping and continuity-specific appearance toggles.
 */
export function TransportControls({
  appearance,
  isScene,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.transportControls}>
      <TransportButtons appearance={appearance} />
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
