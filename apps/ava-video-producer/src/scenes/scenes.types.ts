import {
  type ScrollStep,
  type CarouselWindow,
  type WindowReveal,
  type PullBack,
  type WindowCameraKey,
} from "./TiltedWindowScene/WindowMotion/WindowMotion.types";
import type { ThemeTokenName } from "../storyboard/schema/themeSchema";
import type {
  LockupCta,
  MarkBuild,
  MarkFlyThrough,
} from "./BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import type { GraphPacket } from "./layout/graphLayout";
import type {
  HeadingReveal,
  StagedExit,
  TextRevealMode,
} from "./textReveal/textReveal";
import type { WindowBoxName } from "./TiltedWindowScene/windowTilt";
/**
 * All times are scene-local frames. Coordinates are normalized unless noted.
 */
export type SceneBase = {
  frame: number;
  width?: number;
  height?: number;
  title?: string;
  kicker?: string;
  /**
   * How the title and kicker arrive. Default: each rises in, the kicker a
   * panel after the title.
   */
  headingReveal?: HeadingReveal;
};
export type GraphNode = {
  id: string;
  label: string;
  detail?: string;
  x: number;
  y: number;
  /** Card width as a fraction of the content width. Default about 20%. */
  width?: number;
  /** A short list drawn inside the card, cascading in under its label. */
  items?: string[];
  /** `ticks` draws corner ticks instead of a filled bordered card. */
  frame?: "card" | "ticks";
};
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Sideways shift from -1 to 1, for parallel edges between two cards. */
  offset?: number;
  /** Draws an arrowhead at `to`. Default true. */
  arrow?: boolean;
  /** Dots travelling the edge, each in its own window of frames. */
  packets?: GraphPacket[];
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
  /** How the lines arrive. Default `word-mask`. */
  revealMode?: TextRevealMode;
  /** Frames between lines for the line-by-line modes. Default 3. */
  lineStaggerFrames?: number;
  /**
   * A public-relative image drawn above the lines, `size` px tall. It
   * fades in at `atFrame`, or at `revealAtFrame` with the lines a panel
   * later when `atFrame` is omitted.
   */
  icon?: { src: string; size?: number; atFrame?: number };
  /** Lines fade out top to bottom, then the icon. */
  exit?: StagedExit;
  /** `caption` sets small regular-weight text instead of a display size. */
  size?: "display" | "caption";
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
/** One hero number over its ranked rows in a `BarComparisonScene`. */
export type BarComparisonPanel = {
  value: number;
  precision?: number;
  /** Drawn after the number in the brand colour, such as `s` or `MiB`. */
  unit?: string;
  caption?: string;
  rows: Array<{
    label: string;
    /** Nonnegative bar length, relative to the panel's longest bar. */
    value: number;
    /** Text shown at the row's end. Defaults to the formatted value. */
    display?: string;
    /** Draws this bar in the brand colour. */
    highlight?: boolean;
  }>;
};
export type BarComparisonSceneProps = SceneBase & {
  panels: BarComparisonPanel[];
  revealAtFrame?: number;
  /** Frames between the first and second panel's staging. Default 3. */
  panelStaggerFrames?: number;
  barEdge?: "straight" | "rough";
  /** Small source or fictional-data note under the panels. */
  footnote?: string;
  /** Erases every element left to right, panel by panel. */
  exit?: {
    kind: "erase";
    atFrame: number;
    /** Fractional frames between elements in a panel. Default 0.1. */
    staggerFrames?: number;
    /** Frames each element's erase takes. Default `DUR.press`. */
    durationInFrames?: number;
  };
};
export type BrandLockupSceneProps = SceneBase & {
  /** Public-relative raster mark. `aspectRatio` is its width over height. */
  logo: { src: string; aspectRatio?: number; height?: number };
  wordmark?: string;
  /** Builds the mark through N column masks rising left to right. */
  build?: MarkBuild;
  /** Frame the wordmark wipes in. Defaults to just after the build. */
  wordmarkAtFrame?: number;
  /** A CTA stack below the mark; the lockup moves up to make room. */
  cta?: LockupCta;
  /** The mark's columns fly through and cover the frame in `color`. */
  exit?: MarkFlyThrough & { color?: ThemeTokenName };
};
/** A still or footage shown inside a tilted window. */
export type WindowSource = {
  kind: "image" | "video";
  src: string;
  trimBefore?: number;
  fit?: "contain" | "cover";
  objectPosition?: { x: number; y: number };
  /** Jumps through a tall still, as fractions of its height. */
  scrollSteps?: ScrollStep[];
};
/** A headline beside the window; later ones replace earlier ones. */
export type WindowHeadline = {
  atFrame: number;
  lines: string[];
  /** A small dimmed monospace note under the headline. */
  subtitle?: string;
};
/** One side of the `pair` layout: label, window, live counter and stat. */
export type RaceColumn = {
  label: string;
  window: WindowSource;
  counter: {
    from?: number;
    to: number;
    precision?: number;
    unit?: string;
    startFrame: number;
    /** The counter stops here and turns the brand colour. */
    endFrame: number;
  };
  stat?: string;
};
export type TiltedWindowSceneProps = SceneBase & {
  headlines?: WindowHeadline[];
  /** `single` shows one window (or a carousel); `pair` shows two. */
  layout?: "single" | "pair";
  /** Single layout. Each window after the first swaps in at `atFrame`. */
  windows?: Array<WindowSource & CarouselWindow>;
  pair?: [RaceColumn, RaceColumn];
  /** Small badge above the right column of the pair layout. */
  badge?: string;
  enter?:
    | {
        kind: "whip";
        atFrame?: number;
        /** Frames the window takes to land. Default `DUR.sheet`. */
        durationInFrames?: number;
        /** Reveals the window through rising columns as it arrives. */
        reveal?: WindowReveal;
      }
    | {
        /** Pair only: each window slides in from its own outer edge. */
        kind: "from-sides";
        atFrame?: number;
        /** Frames the windows take to land. Default `DUR.panel`. */
        durationInFrames?: number;
      }
    | { kind: "flip-split" | "none"; atFrame?: number }
    | PullBack;
  /**
   * Windows whip off the left edge from `atFrame` over `durationInFrames`
   * (default `DUR.whip`).
   */
  exit?: { kind: "whip-left"; atFrame: number; durationInFrames?: number };
  /**
   * Single layout: which window box from `WINDOW_BOXES` the window rests
   * in. Default `default`.
   */
  windowBox?: WindowBoxName;
  /** A camera on the primary window only; the headline never moves. */
  camera?: WindowCameraKey[];
  /** A small second window in the same plane, such as a desktop app. */
  secondary?: WindowSource & { box: NormalizedRect; atFrame: number };
  chrome?: "titlebar" | "none";
  /**
   * Small muted note at the bottom left, for example **Fictional
   * demonstration data** under product footage.
   */
  footnote?: string;
};
