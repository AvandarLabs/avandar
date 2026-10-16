import { DUR } from "../motion";
import { GraphScene } from "./GraphScene";
import { assertFrame, flowNodes } from "./layout/layout";
import type { FlowchartSceneProps } from "./scenes.types";

/** Explicit directed connectors support linear paths and branches. */
export function FlowchartScene({
  steps,
  connectors,
  activeStep,
  stepAtFrames,
  revealAtFrame = 10,
  ...base
}: FlowchartSceneProps) {
  const nodes = flowNodes(steps);
  if (activeStep !== undefined && !steps.some((step) => step.id === activeStep))
    throw new Error(`Unknown activeStep: ${activeStep}`);
  if (stepAtFrames && stepAtFrames.length !== steps.length)
    throw new Error(
      "stepAtFrames must contain one frame for every flowchart step",
    );
  const times =
    stepAtFrames ??
    steps.map((_, index) => revealAtFrame + DUR.sheet + index * 60);
  times.forEach((time, index) => {
    assertFrame(time, "stepAtFrames");
    if (index && time <= times[index - 1])
      throw new Error("stepAtFrames must be strictly increasing");
  });
  const traversal =
    activeStep !== undefined
      ? [{ nodeId: activeStep, atFrame: revealAtFrame }]
      : steps.map((step, index) => ({
          nodeId: step.id,
          atFrame: times[index],
        }));
  const edges = connectors.map((edge, index) => ({
    ...edge,
    id: `connector-${index}`,
  }));
  return (
    <GraphScene {...base} {...{ nodes, edges, traversal, revealAtFrame }} />
  );
}
