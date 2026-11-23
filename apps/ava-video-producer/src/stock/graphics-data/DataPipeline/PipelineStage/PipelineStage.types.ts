import type { ResolvedVideoComponents } from "../../../../videoTheme/videoTheme.types";
import type { DataPipelineInput } from "../../../presets/DataPipeline/DataPipeline.schema";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within PipelineStage. */
export type Stage = DataPipelineInput["stages"][number] & {
  x: number;
};
/** Rendering data shared within PipelineStage. */
export type Props = {
  stage: Stage;
  index: number;
  frame: number;
  accent: string;
  active: number;
};
/** Rendering data shared within PipelineStage. */
export type StagePanelData = {
  stage: Props["stage"];
  index: Props["index"];
  accent: Props["accent"];
  active: Props["active"];
  style: ResolvedVideoComponents["DataPipeline"];
  panel: ResolvedVideoComponents["Panel"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  iconX: number;
};
