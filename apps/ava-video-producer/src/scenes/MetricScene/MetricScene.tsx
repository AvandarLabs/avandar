import { SceneShell } from "../SceneShell/SceneShell";
import { MetricCard } from "./MetricCard/MetricCard";
import { useMetricScene } from "./useMetricScene";
import type { MetricSceneProps as Props } from "../scenes.types";
import type { ReactNode } from "react";

/**
 * A single headline metric that counts from an initial value up to its target.
 * The figure is `text.stage.figure` in the strong brand colour, the label
 * the `text.stage.caption` weight, on a scene palette card.
 */
export function MetricScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  label,
  value,
  from = 0,
  unit,
  precision = 0,
  detail,
  countAtFrame = 18,
  countDurationInFrames = 36,
}: Props): ReactNode {
  const content = useMetricScene({
    input: {
      frame,
      width,
      height,
      title,
      kicker,
      label,
      value,
      from,
      unit,
      precision,
      detail,
      countAtFrame,
      countDurationInFrames,
    },
  });
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <MetricCard {...content} />
    </SceneShell>
  );
}
