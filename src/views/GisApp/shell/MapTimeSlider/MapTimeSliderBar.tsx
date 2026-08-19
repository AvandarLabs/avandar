import { useLingui } from "@lingui/react/macro";
import { ActionIcon, RangeSlider } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useState } from "react";
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

/**
 * Keeps the thumbs following the pointer while the committed range stays put.
 *
 * The committed value is tracked alongside the draft so a range changed
 * elsewhere (the play button, or clamping to the data's extent) still moves the
 * thumbs, while a drag in progress is not overwritten by the value it is about
 * to replace.
 */
function useDraggingSliderValue(sliderValue: [number, number]): {
  value: [number, number];
  setDragging: (value: [number, number]) => void;
  commit: (value: [number, number]) => void;
} {
  const [draft, setDraft] = useState({
    committed: sliderValue,
    value: sliderValue,
  });
  if (
    draft.committed[0] !== sliderValue[0] ||
    draft.committed[1] !== sliderValue[1]
  ) {
    setDraft({ committed: sliderValue, value: sliderValue });
  }
  return {
    value: draft.value,
    setDragging: (value) => {
      setDraft((current) => {
        return { ...current, value };
      });
    },
    commit: (value) => {
      setDraft({ committed: value, value });
    },
  };
}

/**
 * Range slider and play control for the map clock.
 *
 * The range is committed when a drag ends rather than on every pointer move.
 * Each committed range refetches every time-filtered layer, so committing
 * continuously would queue a query per pixel dragged, which on a large layer
 * means many multi-second scans for windows the user never stopped on. Mantine
 * ends a keyboard interaction on key release, so arrow keys still commit once
 * per press.
 */
export function MapTimeSliderBar({
  sliderValue,
  prefersReducedMotion,
  startLabel,
  endLabel,
  onSliderChange,
  onPlay,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const dragging = useDraggingSliderValue(sliderValue);
  return (
    <div className={css.mapTimeSlider} role="group" aria-label={t`Time range`}>
      <RangeSlider
        className={css.mapTimeSliderTrack}
        min={0}
        max={SLIDER_MAX}
        step={1}
        minRange={0}
        label={null}
        value={dragging.value}
        thumbFromLabel={t`Start of time range: ${startLabel}`}
        thumbToLabel={t`End of time range: ${endLabel}`}
        onChange={dragging.setDragging}
        onChangeEnd={(value) => {
          dragging.commit(value);
          onSliderChange(value);
        }}
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
