import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { DataPipelineInput } from "../../presets/DataPipeline/DataPipeline.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within DataPipeline. */
export type Props = GraphicProps & { input: DataPipelineInput };
/** Rendering data shared within DataPipeline. */
export type Drawing = Props & {
  style: ResolvedVideoComponents["DataPipeline"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  margin: number;
  trackWidth: number;
  progress: number;
  stages: Array<DataPipelineInput["stages"][number] & { x: number }>;
};
