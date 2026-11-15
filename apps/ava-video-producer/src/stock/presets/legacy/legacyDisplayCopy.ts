import type { StockMessageDescriptor } from "../../contracts/StockContract.types";

/** Fixed legacy display units are separate from supplied authored content. */
export const LEGACY_DISPLAY_COPY = {
  "network-graph": {
    relationshipNetwork: {
      id: "motionAtlas.network-graph.display.relationshipNetwork",
      message: "RELATIONSHIP NETWORK",
    },
    nodeCount: {
      id: "motionAtlas.network-graph.display.nodeCount",
      message: "{count} NODES",
    },
  },
  "node-traversal": {
    directedTraversal: {
      id: "motionAtlas.node-traversal.display.directedTraversal",
      message: "DIRECTED TRAVERSAL",
    },
    aSelectedPathThroughAConnectedSystem: {
      id: "motionAtlas.node-traversal.display.aSelectedPathThroughAConnectedSystem",
      message: "A selected path through a connected system",
    },
  },
  "radial-network": {
    hubSpoke: {
      id: "motionAtlas.radial-network.display.hubSpoke",
      message: "HUB & SPOKE",
    },
    manyEndpointsOneSharedCenter: {
      id: "motionAtlas.radial-network.display.manyEndpointsOneSharedCenter",
      message: "Many endpoints. One shared center.",
    },
  },
  "plexus-field": {
    ambientConnections: {
      id: "motionAtlas.plexus-field.display.ambientConnections",
      message: "AMBIENT CONNECTIONS",
    },
    particleCount: {
      id: "motionAtlas.plexus-field.display.particleCount",
      message: "{count} PARTICLES",
    },
    deterministicField: {
      id: "motionAtlas.plexus-field.display.deterministicField",
      message: "DETERMINISTIC FIELD",
    },
  },
  "orbital-system": {
    orbitalSystem: {
      id: "motionAtlas.orbital-system.display.orbitalSystem",
      message: "ORBITAL SYSTEM",
    },
    independentMotionSharedGravity: {
      id: "motionAtlas.orbital-system.display.independentMotionSharedGravity",
      message: "Independent motion. Shared gravity.",
    },
  },
  "source-merge": {
    unifyTheInputs: {
      id: "motionAtlas.source-merge.display.unifyTheInputs",
      message: "UNIFY THE INPUTS",
    },
    merge: {
      id: "motionAtlas.source-merge.display.merge",
      message: "MERGE",
    },
    conceptualDataFlow: {
      id: "motionAtlas.source-merge.display.conceptualDataFlow",
      message: "CONCEPTUAL DATA FLOW",
    },
  },
  "data-pipeline": {
    dataPipeline: {
      id: "motionAtlas.data-pipeline.display.dataPipeline",
      message: "DATA PIPELINE",
    },
    input: {
      id: "motionAtlas.data-pipeline.display.input",
      message: "INPUT",
    },
    output: {
      id: "motionAtlas.data-pipeline.display.output",
      message: "OUTPUT",
    },
  },
  "schema-mapping": {
    schemaMapping: {
      id: "motionAtlas.schema-mapping.display.schemaMapping",
      message: "SCHEMA MAPPING",
    },
    differentNamesExplicitConnections: {
      id: "motionAtlas.schema-mapping.display.differentNamesExplicitConnections",
      message: "Different names. Explicit connections.",
    },
  },
  "packet-stream": {
    packetStream: {
      id: "motionAtlas.packet-stream.display.packetStream",
      message: "PACKET STREAM",
    },
    produce: {
      id: "motionAtlas.packet-stream.display.produce",
      message: "PRODUCE",
    },
    transport: {
      id: "motionAtlas.packet-stream.display.transport",
      message: "TRANSPORT",
    },
    receive: {
      id: "motionAtlas.packet-stream.display.receive",
      message: "RECEIVE",
    },
  },
  "event-bus": {
    producerNumber: {
      id: "motionAtlas.event-bus.display.producerNumber",
      message: "PRODUCER {number}",
    },
    subscriberNumber: {
      id: "motionAtlas.event-bus.display.subscriberNumber",
      message: "SUBSCRIBER {number}",
    },
  },
  "code-focus": {
    codeFocus: {
      id: "motionAtlas.code-focus.display.codeFocus",
      message: "CODE FOCUS",
    },
    exampleCode: {
      id: "motionAtlas.code-focus.display.exampleCode",
      message: "EXAMPLE CODE",
    },
  },
  "terminal-type": {
    terminalType: {
      id: "motionAtlas.terminal-type.display.terminalType",
      message: "TERMINAL TYPE",
    },
  },
  "scan-lines": {
    scanningPass: {
      id: "motionAtlas.scan-lines.display.scanningPass",
      message: "SCANNING PASS",
    },
    sampleRecords: {
      id: "motionAtlas.scan-lines.display.sampleRecords",
      message: "SAMPLE RECORDS",
    },
    inspect: {
      id: "motionAtlas.scan-lines.display.inspect",
      message: "INSPECT",
    },
    verify: {
      id: "motionAtlas.scan-lines.display.verify",
      message: "VERIFY",
    },
  },
  "bar-race": {
    rankingInMotion: {
      id: "motionAtlas.bar-race.display.rankingInMotion",
      message: "RANKING IN MOTION",
    },
    fictionalData: {
      id: "motionAtlas.bar-race.display.fictionalData",
      message: "FICTIONAL DATA",
    },
    illustrativeValuesFixed0100Scale: {
      id: "motionAtlas.bar-race.display.illustrativeValuesFixed0100Scale",
      message: "Illustrative values · fixed 0–100 scale",
    },
    periodTransition: {
      id: "motionAtlas.bar-race.display.periodTransition",
      message: "PERIOD 01 → 02",
    },
    periodFinal: {
      id: "motionAtlas.bar-race.display.periodFinal",
      message: "PERIOD 02",
    },
  },
  "line-trace": {
    lineTrace: {
      id: "motionAtlas.line-trace.display.lineTrace",
      message: "LINE TRACE",
    },
    fictionalData: {
      id: "motionAtlas.line-trace.display.fictionalData",
      message: "FICTIONAL DATA",
    },
    samplePeriods: {
      id: "motionAtlas.line-trace.display.samplePeriods",
      message: "SAMPLE PERIODS",
    },
  },
  "metric-counter": {
    metricCounter: {
      id: "motionAtlas.metric-counter.display.metricCounter",
      message: "METRIC COUNTER",
    },
    fictionalData: {
      id: "motionAtlas.metric-counter.display.fictionalData",
      message: "FICTIONAL DATA",
    },
    sampleTotal: {
      id: "motionAtlas.metric-counter.display.sampleTotal",
      message: "SAMPLE TOTAL",
    },
    aMeasuredArrivalFollowedByAReadingHold: {
      id: "motionAtlas.metric-counter.display.aMeasuredArrivalFollowedByAReadingHold",
      message: "A measured arrival, followed by a reading hold.",
    },
  },
  "dot-matrix": {
    cohortMatrix: {
      id: "motionAtlas.dot-matrix.display.cohortMatrix",
      message: "COHORT MATRIX",
    },
    fictionalData: {
      id: "motionAtlas.dot-matrix.display.fictionalData",
      message: "FICTIONAL DATA",
    },
    cohortTotal: {
      id: "motionAtlas.dot-matrix.display.cohortTotal",
      message: "of {count}",
    },
    illustrativeCohort: {
      id: "motionAtlas.dot-matrix.display.illustrativeCohort",
      message: "ILLUSTRATIVE COHORT · {count} EXAMPLES",
    },
  },
  "stagger-cards": {
    staggeredAssembly: {
      id: "motionAtlas.stagger-cards.display.staggeredAssembly",
      message: "STAGGERED ASSEMBLY",
    },
    conceptualCards: {
      id: "motionAtlas.stagger-cards.display.conceptualCards",
      message: "CONCEPTUAL CARDS",
    },
    siblingsArriveInSequence: {
      id: "motionAtlas.stagger-cards.display.siblingsArriveInSequence",
      message: "SIBLINGS ARRIVE IN SEQUENCE",
    },
  },
  "word-reveal": {
    maskedWordReveal: {
      id: "motionAtlas.word-reveal.display.maskedWordReveal",
      message: "MASKED WORD REVEAL",
    },
    kineticTypographyOneWordAtATime: {
      id: "motionAtlas.word-reveal.display.kineticTypographyOneWordAtATime",
      message: "Kinetic typography, one word at a time.",
    },
    translationMaskFixedTypeSize: {
      id: "motionAtlas.word-reveal.display.translationMaskFixedTypeSize",
      message: "TRANSLATION + MASK · FIXED TYPE SIZE",
    },
  },
  "status-cycle": {
    statusCycle: {
      id: "motionAtlas.status-cycle.display.statusCycle",
      message: "STATUS CYCLE",
    },
    exampleState: {
      id: "motionAtlas.status-cycle.display.exampleState",
      message: "EXAMPLE STATE",
    },
    runStatus: {
      id: "motionAtlas.status-cycle.display.runStatus",
      message: "RUN STATUS",
    },
    sampleTask: {
      id: "motionAtlas.status-cycle.display.sampleTask",
      message: "SAMPLE TASK",
    },
  },
} satisfies Record<string, Record<string, StockMessageDescriptor>>;
