import { SketchedShape } from "../../../primitives/SketchedShape";
import { ActivityPaper } from "../ActivityPaper/ActivityPaper";
import { ReturnActivityLabels } from "../ReturnActivityLabels";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type ParentProps = {
  activity: Input["returnActivities"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  activity: Readonly<ParentProps>["activity"];
  index: Readonly<ParentProps>["index"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  progress: number;
  x: number;
  priorIndex: number;
  visible: boolean;
};

/** Renders the return activity activity id in authored paint order. */
export function ReturnActivityActivityId(options: Readonly<Props>): ReactNode {
  return (
    <g data-activity-id={options.activity.id} opacity={options.visible ? 1 : 0}>
      {options.activity.kind === "review" && options.progress === 1 ? (
        <g data-review-target={options.activity.priorWorkId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${options.x} 342 V${318 + options.index * 5} H${280 + options.priorIndex * 50} V288`,
            }}
            profile={options.tokens.sketch.shape}
            fill="none"
            stroke={options.tokens.color.accentAlt}
            strokeDasharray={options.atomic.dash.short.join(" ")}
          />
        </g>
      ) : undefined}
      <ActivityPaper
        activity={options.activity}
        index={options.index}
        x={options.x}
        accent={options.accent}
      />
      {options.progress === 1 ? (
        <ReturnActivityLabels
          activity={options.activity}
          input={options.input}
          index={options.index}
        />
      ) : undefined}
    </g>
  );
}
