/** All times are scene-local frames. Coordinates are normalized unless noted. */
export type SceneBase = {
  frame: number;
  width?: number;
  height?: number;
  title?: string;
  kicker?: string;
};

export type GraphNode = {
  id: string;
  label: string;
  detail?: string;
  x: number;
  y: number;
};
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};
export type TraversalBeat = { nodeId: string; atFrame: number };
export type GraphSceneProps = SceneBase & {
  nodes: GraphNode[];
  edges: GraphEdge[];
  traversal?: TraversalBeat[];
  revealAtFrame?: number;
};

export type FlowStep = { id: string; label: string; detail?: string };
export type FlowConnector = { from: string; to: string; label?: string };
export type FlowchartSceneProps = SceneBase & {
  steps: FlowStep[];
  connectors: FlowConnector[];
  activeStep?: string;
  stepAtFrames?: number[];
  revealAtFrame?: number;
};

export type MetricSceneProps = SceneBase & {
  label: string;
  value: number;
  from?: number;
  unit?: string;
  precision?: number;
  detail?: string;
  countAtFrame?: number;
  countDurationInFrames?: number;
};

export type TypographySceneProps = SceneBase & {
  lines: string[];
  /** Exact, case-sensitive words, including punctuation. */
  emphasis?: string[];
  align?: "left" | "center";
  fontSize?: number;
  revealAtFrame?: number;
  wordStaggerFrames?: number;
};

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type MediaCallout = NormalizedRect & {
  id: string;
  label: string;
  startFrame: number;
  endFrame: number;
};
export type MediaSceneProps = SceneBase & {
  kind: "image" | "video";
  /** Path inside public/, without a leading slash, URL, query, or fragment. */
  src: string;
  trimBefore?: number;
  fit?: "contain" | "cover";
  objectPosition?: { x: number; y: number };
  /** Crop of the fitted media plane, not intrinsic source pixels. */
  crop?: NormalizedRect;
  /** Rectangles are relative to the final visible media viewport. */
  callouts?: MediaCallout[];
};

export type CaptionCue = {
  id: string;
  startFrame: number;
  endFrame: number;
  text: string;
};
export type CaptionOverlayProps = {
  frame: number;
  cues: CaptionCue[];
  width?: number;
  height?: number;
  bottom?: number;
  fontSize?: number;
};
