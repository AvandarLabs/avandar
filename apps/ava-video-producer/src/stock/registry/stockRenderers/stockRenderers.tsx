import { BarRace } from "../../graphics-charts/BarRace/BarRace";
import { LineTrace } from "../../graphics-charts/LineTrace/LineTrace";
import { MetricCounter } from "../../graphics-charts/MetricCounter/MetricCounter";
import { CodeFocus } from "../../graphics-code/CodeFocus/CodeFocus";
import { ScanLines } from "../../graphics-code/ScanLines/ScanLines";
import { TerminalType } from "../../graphics-code/TerminalType/TerminalType";
import { DataPipeline } from "../../graphics-data/DataPipeline/DataPipeline";
import { EventBus } from "../../graphics-data/EventBus/EventBus";
import { PacketStream } from "../../graphics-data/PacketStream/PacketStream";
import { SchemaMapping } from "../../graphics-data/SchemaMapping/SchemaMapping";
import { SourceMerge } from "../../graphics-data/SourceMerge/SourceMerge";
import { DotMatrix } from "../../graphics-interface/DotMatrix/DotMatrix";
import { StaggerCards } from "../../graphics-interface/StaggerCards/StaggerCards";
import { StatusCycle } from "../../graphics-interface/StatusCycle/StatusCycle";
import { WordReveal } from "../../graphics-interface/WordReveal/WordReveal";
import { NetworkGraph } from "../../graphics-networks/NetworkGraph/NetworkGraph";
import { NodeTraversal } from "../../graphics-networks/NodeTraversal/NodeTraversal";
import { OrbitalSystem } from "../../graphics-networks/OrbitalSystem/OrbitalSystem";
import { PlexusField } from "../../graphics-networks/PlexusField/PlexusField";
import { RadialNetwork } from "../../graphics-networks/RadialNetwork/RadialNetwork";
import { generalStockRenderers } from "./generalStockRenderers";
import { makeStockRendererFromComponent } from "./makeStockRendererFromComponent";
import { socialSectorStockRenderers } from "./socialSectorStockRenderers";
import type { StockPresetId } from "../../contracts/StockContract.types";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";

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
