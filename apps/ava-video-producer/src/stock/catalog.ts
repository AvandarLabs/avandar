/** Stable references for conceptual graphics, never evidence of product behavior. */
export const STOCK_CATEGORIES = [
  "Networks",
  "Data flow",
  "Code",
  "Charts",
  "Interface",
] as const;
export type StockCategory = (typeof STOCK_CATEGORIES)[number];
export const STOCK_IDS = [
  "network-graph",
  "node-traversal",
  "radial-network",
  "plexus-field",
  "orbital-system",
  "source-merge",
  "data-pipeline",
  "schema-mapping",
  "packet-stream",
  "event-bus",
  "code-focus",
  "terminal-type",
  "scan-lines",
  "bar-race",
  "line-trace",
  "metric-counter",
  "dot-matrix",
  "stagger-cards",
  "word-reveal",
  "status-cycle",
] as const;
export type StockPresetId = (typeof STOCK_IDS)[number];
export const STOCK_LOOP_FRAMES = 180;
export const STOCK_FPS = 30;

export type StockEntry = {
  id: StockPresetId;
  name: string;
  category: StockCategory;
  description: string;
  tags: string[];
  useWhen: string;
  prompt: string;
  loopFrames: number;
};

const _entry = ({
  id,
  name,
  category,
  description,
  tags,
  useWhen,
}: {
  id: StockPresetId;
  name: string;
  category: StockCategory;
  description: string;
  tags: string[];
  useWhen: string;
}): StockEntry => ({
  id,
  name,
  category,
  description,
  tags,
  useWhen,
  prompt: `Use Motion Atlas "${name}" (${id}) as a conceptual graphic. ${useWhen} Keep the restrained motion and readable labels; replace sample content with approved facts before making product claims.`,
  loopFrames: STOCK_LOOP_FRAMES,
});

export const STOCK_CATALOG: readonly StockEntry[] = [
  _entry({
    id: "network-graph",
    name: "Connected entities",
    category: "Networks",
    description: "Nodes assemble into a connected relationship graph.",
    tags: ["graph", "nodes", "edges", "relationships"],
    useWhen:
      "Introduce relationships among people, places, records, or entities.",
  }),
  _entry({
    id: "node-traversal",
    name: "Follow the connection",
    category: "Networks",
    description: "A signal traces a route through a small network.",
    tags: ["graph", "path", "traversal", "highlight"],
    useWhen:
      "Follow one record or decision through a set of explicit connections.",
  }),
  _entry({
    id: "radial-network",
    name: "Hub & spokes",
    category: "Networks",
    description: "A central hub exchanges signals with its satellites.",
    tags: ["hub", "radial", "connections", "sync"],
    useWhen:
      "Explain a shared workspace, central service, or coordination point.",
  }),
  _entry({
    id: "plexus-field",
    name: "Plexus field",
    category: "Networks",
    description: "Drifting particles connect as they pass nearby.",
    tags: ["plexus", "particles", "mesh", "ambient"],
    useWhen:
      "Use an abstract connected field behind a chapter opening or a broad systems idea.",
  }),
  _entry({
    id: "orbital-system",
    name: "Orbital system",
    category: "Networks",
    description: "Satellites orbit a stable center on layered paths.",
    tags: ["orbit", "ecosystem", "satellites", "ambient"],
    useWhen:
      "Suggest an ecosystem around one central idea without implying measured relationships.",
  }),
  _entry({
    id: "source-merge",
    name: "Many sources, one view",
    category: "Data flow",
    description: "Separate sources converge into a shared destination.",
    tags: ["integration", "import", "merge", "sources"],
    useWhen:
      "Introduce data integration before showing the actual supported import workflow.",
  }),
  _entry({
    id: "data-pipeline",
    name: "Processing pipeline",
    category: "Data flow",
    description: "Data moves through a sequence of named stages.",
    tags: ["pipeline", "ETL", "transform", "workflow"],
    useWhen:
      "Explain the order of a process with only the stages verified for the product.",
  }),
  _entry({
    id: "schema-mapping",
    name: "Field mapping",
    category: "Data flow",
    description: "Source fields connect to their destination schema.",
    tags: ["schema", "mapping", "fields", "join"],
    useWhen:
      "Explain field correspondence or data normalization with an authored mapping.",
  }),
  _entry({
    id: "packet-stream",
    name: "Packet stream",
    category: "Data flow",
    description: "Small data packets travel along parallel lanes.",
    tags: ["stream", "packets", "transfer", "lanes"],
    useWhen:
      "Suggest movement of data between two systems, without claiming real-time speed.",
  }),
  _entry({
    id: "event-bus",
    name: "Event bus",
    category: "Data flow",
    description: "Producers send signals through a shared bus to subscribers.",
    tags: ["events", "pubsub", "routing", "fan-out"],
    useWhen: "Explain a conceptual producer-and-subscriber event pattern.",
  }),
  _entry({
    id: "code-focus",
    name: "Code spotlight",
    category: "Code",
    description: "An active line brings a code block into focus.",
    tags: ["code", "highlight", "blink", "execution"],
    useWhen:
      "Direct attention to one line in an illustrative query or code excerpt.",
  }),
  _entry({
    id: "terminal-type",
    name: "Terminal typing",
    category: "Code",
    description: "A command types, executes, and reveals its response.",
    tags: ["terminal", "typing", "caret", "command"],
    useWhen:
      "Present an illustrative command sequence; substitute a real command when teaching usage.",
  }),
  _entry({
    id: "scan-lines",
    name: "Document scan",
    category: "Code",
    description: "A scanning band examines a structured document.",
    tags: ["scan", "document", "parsing", "validation"],
    useWhen: "Bridge a document or data intake story into a verified result.",
  }),
  _entry({
    id: "bar-race",
    name: "Ranking in motion",
    category: "Charts",
    description: "Bars grow and change rank between two sample periods.",
    tags: ["bars", "chart", "comparison", "ranking"],
    useWhen:
      "Compare a few supplied values and their changing ranks on a common scale; the stock sample is fictional.",
  }),
  _entry({
    id: "line-trace",
    name: "Trend trace",
    category: "Charts",
    description: "A line draws across its plot with a leading marker.",
    tags: ["line", "chart", "trend", "draw-on"],
    useWhen:
      "Introduce an observed trend using approved values, units, and time range.",
  }),
  _entry({
    id: "metric-counter",
    name: "Metric landing",
    category: "Charts",
    description: "A number counts into place above a small bar series.",
    tags: ["metric", "counter", "number", "progress"],
    useWhen:
      "Give one sourced number a clear visual emphasis without implying an unsupported outcome.",
  }),
  _entry({
    id: "dot-matrix",
    name: "Cohort matrix",
    category: "Charts",
    description: "Individual dots build a compact grouped population.",
    tags: ["dots", "cohort", "population", "matrix"],
    useWhen:
      "Explain a supplied count or proportion with discrete units and a clear denominator.",
  }),
  _entry({
    id: "stagger-cards",
    name: "Staggered collection",
    category: "Interface",
    description: "Cards settle into a grid with a short sibling delay.",
    tags: ["cards", "stagger", "entrance", "collection"],
    useWhen:
      "Introduce a small set of concepts, records, or capabilities with one arrival sequence.",
  }),
  _entry({
    id: "word-reveal",
    name: "Masked statement",
    category: "Interface",
    description: "Words rise from clean masks into a bold statement.",
    tags: ["type", "words", "mask", "kinetic"],
    useWhen:
      "Open a chapter with a short approved statement, giving every word time to land.",
  }),
  _entry({
    id: "status-cycle",
    name: "State progression",
    category: "Interface",
    description: "A task moves through waiting, active, and complete states.",
    tags: ["status", "loading", "progress", "confirmation"],
    useWhen:
      "Explain a generic state progression; show real product footage to prove actual behavior.",
  }),
];

export function stockEntry(id: string): StockEntry {
  const found = STOCK_CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown stock motion preset: ${id}`);
  return found;
}
