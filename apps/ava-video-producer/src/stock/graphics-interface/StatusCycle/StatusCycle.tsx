import { Panel } from "../../graphics-common/Panel";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ActiveStateLabels } from "./ActiveStateLabels";
import { getStatusProgressFromFrame } from "./getStatusProgressFromFrame";
import { ProcessingSpinner } from "./ProcessingSpinner";
import { StateTimelineMarker } from "./StateTimelineMarker";
import { StatusCompletion } from "./StatusCompletion";
import { StatusDial } from "./StatusDial";
import { StatusHeading } from "./StatusHeading";
import { StatusProgress } from "./StatusProgress";
import { StatusTaskSummary } from "./StatusTaskSummary";
import type { Props } from "./StatusCycle.types";
import type { ReactNode } from "react";

/** Renders the authored status study for StockGraphic at a given frame. */
export function StatusCycle(props: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = getStatusProgressFromFrame({
    input: props.input,
    frame: props.frame,
    motion,
  });
  const drawing = {
    ...props,
    atomic,
    color,
    stroke,
    sketch,
    shapes,
    motion,
    ...progress,
  };
  return (
    <g>
      <StatusHeading {...drawing} />
      <Panel x={174} y={157} width={612} height={293}>
        <StatusDial {...drawing} />
        <ProcessingSpinner {...drawing} />
        <StatusCompletion {...drawing} />
        <ActiveStateLabels {...drawing} />
        <StatusProgress {...drawing} />
        <StatusTaskSummary {...drawing} />
      </Panel>
      {drawing.states.map((state, stateIndex) => {
        return (
          <StateTimelineMarker
            key={state.label}
            {...{ ...drawing, state, stateIndex }}
          />
        );
      })}
    </g>
  );
}
