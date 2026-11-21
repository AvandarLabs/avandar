import { propEq } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getExclusionFromFrame } from "../getExclusionFromFrame";
import { SubscriptionRecords } from "./SubscriptionRecords";
import type { Input } from "../FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = {
  view: Input["views"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/** Frames between neighbouring views appearing. */
const VIEW_STAGGER_FRAMES = 3;

/** Frames a view takes to fade in. */
const VIEW_FRAMES = 25;

/** One view retains the common denominator unless it subscribes. */
export function SubscriptionView({
  view,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const x = 48 + index * (864 / input.views.length),
    width = 864 / input.views.length - 18;
  const progress = getExclusionFromFrame({ frame, motion });
  const rows =
    view.subscribed && progress === 1
      ? input.records.filter(propEq("category", input.selectedCategory))
      : input.records;
  const sum = rows.reduce((total, record) => {
    return total + record.value;
  }, 0);
  return (
    <g
      data-view={view.id}
      data-count={rows.length}
      data-sum={sum}
      data-value-unit={input.metric.valueUnit}
      data-count-unit={input.metric.countUnit}
      opacity={Motion.ramp({
        frame,
        at: 13 + index * motion.scaleStagger(VIEW_STAGGER_FRAMES),
        dur: motion.scale(VIEW_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <SubscriptionRecords
        view={view}
        input={input}
        frame={frame}
        accent={accent}
        x={x}
        width={width}
        rows={rows}
        sum={sum}
      />
    </g>
  );
}
