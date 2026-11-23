import { TokenDefinitions } from "../TokenDefinitions";
import { CODE_FOCUS_TOKENS } from "./codeFocusTokens";
import { CODE_WINDOW_TOKENS } from "./codeWindowTokens";
import { DATA_PIPELINE_TOKENS } from "./dataPipelineTokens";
import { DECISION_FORK_TOKENS } from "./decisionForkTokens";
import { NETWORK_GRAPH_TOKENS } from "./networkGraphTokens";
import { ORBITAL_SYSTEM_TOKENS } from "./orbitalSystemTokens";
import { OVERLAY_TOKENS } from "./overlayTokens";
import { PLEXUS_FIELD_TOKENS } from "./plexusFieldTokens";
import { PREDICATE_PUSHDOWN_TOKENS } from "./predicatePushdownTokens";
import { QUERY_CACHE_TOKENS } from "./queryCacheTokens";
import { RADIAL_NETWORK_TOKENS } from "./radialNetworkTokens";
import { SCENE_COMPONENT_TOKENS } from "./sceneComponentTokens";
import { SCHEMA_MAPPING_TOKENS } from "./schemaMappingTokens";
import { SHARED_GRAPHIC_TOKENS } from "./sharedGraphicTokens";
import { SOURCE_MERGE_TOKENS } from "./sourceMergeTokens";
import { STAGE_TOKENS } from "./stageTokens";
import { TRANSITION_TOKENS } from "./transitionTokens";

/**
 * Component tokens: `components.<Name>.defaultProps` in a theme, read by
 * themed shapes through Mantine `useProps` (via `useVideoProps`). A value is
 * a reference or a deliberate literal one-off. Each themed shape has one
 * entry here, merged from the shared, stage, overlay, transition, and
 * scene groups.
 */
export const COMPONENT_TOKENS = {
  ...SHARED_GRAPHIC_TOKENS,
  ...STAGE_TOKENS,
  ...OVERLAY_TOKENS,
  ...TRANSITION_TOKENS,
  ...SCENE_COMPONENT_TOKENS,
  NetworkGraph: NETWORK_GRAPH_TOKENS,
  RadialNetwork: RADIAL_NETWORK_TOKENS,
  PlexusField: PLEXUS_FIELD_TOKENS,
  OrbitalSystem: ORBITAL_SYSTEM_TOKENS,
  DataPipeline: DATA_PIPELINE_TOKENS,
  PredicatePushdownBoundary: PREDICATE_PUSHDOWN_TOKENS,
  CodeWindow: CODE_WINDOW_TOKENS,
  CodeFocus: CODE_FOCUS_TOKENS,
  SchemaMapping: SCHEMA_MAPPING_TOKENS,
  QueryColumnCacheGrowth: QUERY_CACHE_TOKENS,
  SourceMerge: SOURCE_MERGE_TOKENS,
  DecisionFork: DECISION_FORK_TOKENS,
  ProgressBar: {
    height: TokenDefinitions.token({
      kind: "length",
      surface: "stage",
      unit: "px",
      min: 1,
      max: 16,
      step: 1,
      label: "Progress bar height",
      description:
        "Thickness of the beat progress bar along the bottom of the stage.",
    }),
    paint: TokenDefinitions.token({
      kind: "paint",
      surface: "stage",
      label: "Progress bar colour",
      description: "Colour and opacity of the beat progress bar.",
    }),
  },
} as const;
