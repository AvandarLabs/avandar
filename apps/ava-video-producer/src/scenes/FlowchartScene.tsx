import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { GraphScene } from "./GraphScene/GraphScene";
import { assertFrame, flowNodes } from "./layout/layout";
import type { FlowchartSceneProps as Props } from "./scenes.types";
import type { ReactNode } from "react";
/** Explicit directed connectors support linear paths and branches. */
export function FlowchartScene({
  steps,
  connectors,
  activeStep,
  stepAtFrames,
  revealAtFrame = 10,
  ...base
}: Props): ReactNode {
  const motion = useVideoMotion();
  const nodes = flowNodes(steps);
  if (
    activeStep !== undefined &&
    !steps.some((step) => {
      return step.id === activeStep;
    })
  )
    throw new Error(`Unknown activeStep: ${activeStep}`);
  if (stepAtFrames && stepAtFrames.length !== steps.length)
    throw new Error(
      "stepAtFrames must contain one frame for every flowchart step",
    );
  const times =
    stepAtFrames ??
    steps.map((_, index) => {
      return revealAtFrame + motion.sheet + index * 60;
    });
  times.forEach((time, index) => {
    assertFrame(time, "stepAtFrames");
    if (index && time <= times[index - 1])
      throw new Error("stepAtFrames must be strictly increasing");
  });
  const traversal =
    activeStep !== undefined
      ? [{ nodeId: activeStep, atFrame: revealAtFrame }]
      : steps.map((step, index) => {
          return { nodeId: step.id, atFrame: times[index] };
        });
  const edges = connectors.map((edge, index) => {
    return { ...edge, id: `connector-${index}` };
  });
  return (
    <GraphScene {...base} {...{ nodes, edges, traversal, revealAtFrame }} />
  );
}
