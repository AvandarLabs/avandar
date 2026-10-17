import { useId } from "react";
import { loopEnvelope } from "../motion";
import {
  BarRace,
  LineTrace,
  MetricCounter,
} from "./graphics-charts/graphics-charts";
import {
  CodeFocus,
  ScanLines,
  TerminalType,
} from "./graphics-code/graphics-code";
import { STOCK, type GraphicProps } from "./graphics-common";
import {
  DataPipeline,
  EventBus,
  PacketStream,
  SchemaMapping,
  SourceMerge,
} from "./graphics-data/graphics-data";
import {
  DotMatrix,
  StaggerCards,
  StatusCycle,
  WordReveal,
} from "./graphics-interface/graphics-interface";
import {
  NetworkGraph,
  NodeTraversal,
  OrbitalSystem,
  PlexusField,
  RadialNetwork,
} from "./graphics-networks/graphics-networks";
import type { StockPresetId } from "./catalog";

const GRAPHICS: Record<
  StockPresetId,
  (props: GraphicProps) => React.JSX.Element
> = {
  "network-graph": NetworkGraph,
  "node-traversal": NodeTraversal,
  "radial-network": RadialNetwork,
  "plexus-field": PlexusField,
  "orbital-system": OrbitalSystem,
  "source-merge": SourceMerge,
  "data-pipeline": DataPipeline,
  "schema-mapping": SchemaMapping,
  "packet-stream": PacketStream,
  "event-bus": EventBus,
  "code-focus": CodeFocus,
  "terminal-type": TerminalType,
  "scan-lines": ScanLines,
  "bar-race": BarRace,
  "line-trace": LineTrace,
  "metric-counter": MetricCounter,
  "dot-matrix": DotMatrix,
  "stagger-cards": StaggerCards,
  "word-reveal": WordReveal,
  "status-cycle": StatusCycle,
};

export type Props = {
  preset: StockPresetId;
  /** Local frame at 30 fps. The authored loop spans frames 0 through 179. */
  frame: number;
  width?: number;
  height?: number;
  accent?: string;
  background?: string;
};

/**
 * Shared browser/video renderer. Pure SVG, explicit frame time, no Remotion
 * dependency. Presets are conceptual illustrations with fictional example data.
 * A fixed viewBox preserves the layout at every display size. Ground remains
 * opaque while the authored 180-frame envelope returns both ends to that ground.
 */
export function StockGraphic({
  preset,
  frame,
  width = 960,
  height = 600,
  accent = STOCK.mint,
  background = STOCK.ground,
}: Props) {
  const id = `stock-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const Graphic = GRAPHICS[preset];
  const localFrame = Math.max(
    0,
    Math.min(179, Number.isFinite(frame) ? frame : 0),
  );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 960 600"
      role="img"
      aria-label={`${preset.replaceAll("-", " ")}, conceptual motion graphic`}
      style={{ display: "block", background, fontFamily: "Arial, sans-serif" }}
    >
      <rect width={960} height={600} fill={background} />
      <g opacity={loopEnvelope(localFrame, 180)}>
        <Graphic
          frame={localFrame}
          accent={accent}
          background={background}
          id={id}
        />
      </g>
    </svg>
  );
}
