import { useLingui } from "@lingui/react/macro";
import { ActionIcon, RangeSlider } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapTimeSlider/MapTimeSlider.module.css";
import type { ReactNode } from "react";

const SLIDER_MAX = 1000;

type Props = {
  sliderValue: [number, number];
  prefersReducedMotion: boolean;
  startLabel: string;
  endLabel: string;
  onSliderChange: (value: [number, number]) => void;
  onPlay: () => void;
};

/** Range slider and play control for the map clock. */
export function MapTimeSliderBar({
  sliderValue,
  prefersReducedMotion,
  startLabel,
  endLabel,
  onSliderChange,
  onPlay,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.mapTimeSlider} role="group" aria-label={t`Time range`}>
      <RangeSlider
        className={css.mapTimeSliderTrack}
        min={0}
        max={SLIDER_MAX}
        step={1}
        minRange={0}
        label={null}
        value={sliderValue}
        thumbFromLabel={t`Start of time range: ${startLabel}`}
        thumbToLabel={t`End of time range: ${endLabel}`}
        onChange={onSliderChange}
      />
      {prefersReducedMotion ? null : (
        <ActionIcon
          variant="subtle"
          color="neutral"
          aria-label={t`Play`}
          onClick={onPlay}
        >
          <IconPlayerPlay size={17} stroke={1.6} />
        </ActionIcon>
      )}
    </div>
  );
}
