import {
  BarRace,
  LineTrace,
  MetricCounter,
} from "../../graphics-charts/graphics-charts";
import {
  CodeFocus,
  ScanLines,
  TerminalType,
} from "../../graphics-code/graphics-code";
import {
  DataPipeline,
  EventBus,
  PacketStream,
  SchemaMapping,
  SourceMerge,
} from "../../graphics-data/graphics-data";
import {
  DotMatrix,
  StaggerCards,
  StatusCycle,
  WordReveal,
} from "../../graphics-interface/graphics-interface";
import {
  NetworkGraph,
  NodeTraversal,
  OrbitalSystem,
  PlexusField,
  RadialNetwork,
} from "../../graphics-networks/graphics-networks";
import { generalStockRenderers } from "./generalStockRenderers";
import { makeStockRendererFromComponent } from "./makeStockRendererFromComponent";
import { socialSectorStockRenderers } from "./socialSectorStockRenderers";
import type { StockPresetId } from "../../contracts/StockContract.types";
import type { GraphicProps } from "../../graphics-common";

/**
 * Each closure validates its own content before invoking its typed renderer.
 */
export const stockRenderers = {
  "network-graph": makeStockRendererFromComponent({
    preset: "network-graph",
    Renderer: NetworkGraph,
  }),
  "node-traversal": makeStockRendererFromComponent({
    preset: "node-traversal",
    Renderer: NodeTraversal,
  }),
  "radial-network": makeStockRendererFromComponent({
    preset: "radial-network",
    Renderer: RadialNetwork,
  }),
  "plexus-field": makeStockRendererFromComponent({
    preset: "plexus-field",
    Renderer: PlexusField,
  }),
  "orbital-system": makeStockRendererFromComponent({
    preset: "orbital-system",
    Renderer: OrbitalSystem,
  }),
  "source-merge": makeStockRendererFromComponent({
    preset: "source-merge",
    Renderer: SourceMerge,
  }),
  "data-pipeline": makeStockRendererFromComponent({
    preset: "data-pipeline",
    Renderer: DataPipeline,
  }),
  "schema-mapping": makeStockRendererFromComponent({
    preset: "schema-mapping",
    Renderer: SchemaMapping,
  }),
  "packet-stream": makeStockRendererFromComponent({
    preset: "packet-stream",
    Renderer: PacketStream,
  }),
  "event-bus": makeStockRendererFromComponent({
    preset: "event-bus",
    Renderer: EventBus,
  }),
  "code-focus": makeStockRendererFromComponent({
    preset: "code-focus",
    Renderer: CodeFocus,
  }),
  "terminal-type": makeStockRendererFromComponent({
    preset: "terminal-type",
    Renderer: TerminalType,
  }),
  "scan-lines": makeStockRendererFromComponent({
    preset: "scan-lines",
    Renderer: ScanLines,
  }),
  "bar-race": makeStockRendererFromComponent({
    preset: "bar-race",
    Renderer: BarRace,
  }),
  "line-trace": makeStockRendererFromComponent({
    preset: "line-trace",
    Renderer: LineTrace,
  }),
  "metric-counter": makeStockRendererFromComponent({
    preset: "metric-counter",
    Renderer: MetricCounter,
  }),
  "dot-matrix": makeStockRendererFromComponent({
    preset: "dot-matrix",
    Renderer: DotMatrix,
  }),
  "stagger-cards": makeStockRendererFromComponent({
    preset: "stagger-cards",
    Renderer: StaggerCards,
  }),
  "word-reveal": makeStockRendererFromComponent({
    preset: "word-reveal",
    Renderer: WordReveal,
  }),
  "status-cycle": makeStockRendererFromComponent({
    preset: "status-cycle",
    Renderer: StatusCycle,
  }),
  ...generalStockRenderers,
  ...socialSectorStockRenderers,
} satisfies Record<
  StockPresetId,
  (props: GraphicProps, input?: unknown) => React.JSX.Element
>;
