import type { ResolvedVideoSemantic } from "../../videoTheme/videoTheme.types";

/** Frame, palette, and preset identity passed to stock graphic renderers. */
export type GraphicProps = {
  frame: number;
  accent: string;
  background?: string;
  id: string;
};
/** A point in the graphic canvas coordinate system. */
export type Point = { x: number; y: number };

/** A graphic text role, such as `label` or `caption`. */
export type GraphicTextRole = keyof ResolvedVideoSemantic["text"]["graphic"];

/** Node sizes, each resolved through the `Node` radius tokens. */
export type NodeSize = "xs" | "sm" | "md" | "lg" | "xl";
