import type { DataPipelineInput } from "./DataPipeline.schema";

/** Complete fictional example used only when input is omitted. */
export const DATA_PIPELINE_DEFAULT_INPUT: DataPipelineInput = {
  stages: [
    { label: "Collect", detail: "Sources" },
    { label: "Transform", detail: "Rules" },
    { label: "Validate", detail: "Checks" },
    { label: "Deliver", detail: "Destination" },
  ],
  heading: "Every stage, connected.",
  showProgress: true,
};

/** The maximum supported collection density in the authored layout. */
export const dataPipelineDenseInput: DataPipelineInput = {
  ...DATA_PIPELINE_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const dataPipelineChangedInput: DataPipelineInput = {
  ...DATA_PIPELINE_DEFAULT_INPUT,
  stages: [
    { label: "Gather", detail: "Authored source" },
    { label: "Review", detail: "Authored checks" },
  ],
  heading: "Two authored stages",
  showProgress: false,
};

/** Named examples available to editors and semantic regression checks. */
export const dataPipelineFixtures: Array<{
  id: string;
  input: {
    stages: Array<{ label: string; detail: string }>;
    heading: string;
    showProgress: boolean;
  };
}> = [
  { id: "default", input: DATA_PIPELINE_DEFAULT_INPUT },
  { id: "dense", input: dataPipelineDenseInput },
  { id: "changed", input: dataPipelineChangedInput },
];
