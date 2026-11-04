import type { StockSemanticRule } from "../../contracts/StockContract.types";
import type { LegacyStockPresetId } from "../../registry/legacyStockEntry";

/** Exact fixed-slot predicates supplement structural character limits. */
export const LEGACY_TEXT_RULES: Record<
  LegacyStockPresetId,
  StockSemanticRule[]
> = {
  "network-graph": [
    {
      id: "fixed-text-slot-1",
      paths: ["nodes.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 18px and must be <= 150px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["nodes.*.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 12px and must be <= 170px. An omitted optional detail has no text to measure. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "node-traversal": [
    {
      id: "fixed-text-slot-1",
      paths: ["nodes.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 18px and must be <= 150px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["nodes.*.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 12px and must be <= 170px. An omitted optional detail has no text to measure. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "radial-network": [
    {
      id: "fixed-text-slot-1",
      paths: ["hub.label"],
      description:
        "getLegacyWidthFromText uses Arial at 25px and must be <= 116px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["hub.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 12px and must be <= 116px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["spokes.*"],
      description:
        "getLegacyWidthFromText uses Arial at 18px and must be <= 140px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "plexus-field": [
    {
      id: "fixed-text-slot-1",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 22px and must be <= 832px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "orbital-system": [
    {
      id: "fixed-text-slot-1",
      paths: ["bodies.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 12px and must be <= 100px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "source-merge": [
    {
      id: "fixed-text-slot-1",
      paths: ["sources.*.name"],
      description:
        "getLegacyWidthFromText uses Arial at 21px and must be <= 127px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["sources.*.kind"],
      description:
        "getLegacyWidthFromText uses Courier at 13px and must be <= 40px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["destination.label"],
      description:
        "getLegacyWidthFromText uses Arial at 25px and must be <= 194px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-4",
      paths: ["destination.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 16px and must be <= 194px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "data-pipeline": [
    {
      id: "fixed-text-slot-1",
      paths: ["stages.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 22px and must be <= 152px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["stages.*.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 15px and must be <= 152px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 32px and must be <= 832px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "schema-mapping": [
    {
      id: "fixed-text-slot-1",
      paths: ["mappings.*.source"],
      description:
        "getLegacyWidthFromText uses Courier at 17px and must be <= 240px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["mappings.*.target"],
      description:
        "getLegacyWidthFromText uses Courier at 17px and must be <= 152px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["mappings.*.type"],
      description:
        "getLegacyWidthFromText uses Courier at 12px and must be <= 60px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-4",
      paths: ["sourceLabel"],
      description:
        "getLegacyWidthFromText uses Arial at 23px and must be <= 246px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-5",
      paths: ["targetLabel"],
      description:
        "getLegacyWidthFromText uses Arial at 23px and must be <= 246px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "packet-stream": [
    {
      id: "fixed-text-slot-1",
      paths: ["lanes.*.label"],
      description:
        "getLegacyWidthFromText uses Courier at 16px and must be <= 150px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 29px and must be <= 832px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "event-bus": [
    {
      id: "fixed-text-slot-1",
      paths: ["producers.*"],
      description:
        "getLegacyWidthFromText uses Arial at 21px and must be <= 100px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["subscribers.*"],
      description:
        "getLegacyWidthFromText uses Arial at 21px and must be <= 100px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 14px and must be <= 650px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "code-focus": [
    {
      id: "fixed-text-slot-1",
      paths: ["title"],
      description:
        "getLegacyWidthFromText uses Courier at 14px and must be <= 700px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["footer"],
      description:
        "getLegacyWidthFromText uses Courier at 13px and must be <= 738px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["lines.*.*.text"],
      description:
        "getLegacyWidthFromText uses Courier at 21px and must be <= 718px. Concatenate each line’s token text without separators. The joined line also has at most 54 UTF-16 code units. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
  ],
  "terminal-type": [
    {
      id: "fixed-text-slot-1",
      paths: ["command"],
      description:
        "getLegacyWidthFromText uses Courier at 22px and must be <= 730px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["steps.*.text"],
      description:
        "getLegacyWidthFromText uses Courier at 21px and must be <= 621px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["steps.*.detail"],
      description:
        "getLegacyWidthFromText uses Courier at 16px and must be <= 45px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-4",
      paths: ["response"],
      description:
        "getLegacyWidthFromText uses Courier at 20px and must be <= 732px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
    {
      id: "fixed-text-slot-5",
      paths: ["title"],
      description:
        "getLegacyWidthFromText uses Courier at 14px and must be <= 700px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
  ],
  "scan-lines": [
    {
      id: "fixed-text-slot-1",
      paths: ["fields.*"],
      description:
        "getLegacyWidthFromText uses Courier at 18px and must be <= 220px. Sum ceil(fontSize * advance) per Unicode code point. Courier ASCII and right-arrow advances are 0.601em, all others 1.1em.",
    },
  ],
  "bar-race": [
    {
      id: "fixed-text-slot-1",
      paths: ["bars.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 23px and must be <= 113px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 29px and must be <= 832px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "line-trace": [
    {
      id: "fixed-text-slot-1",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 29px and must be <= 832px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["seriesLabel"],
      description:
        "getLegacyWidthFromText uses Arial at 15px and must be <= 105px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["referenceLabel"],
      description:
        "getLegacyWidthFromText uses Arial at 15px and must be <= 170px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "metric-counter": [
    {
      id: "fixed-text-slot-1",
      paths: ["label"],
      description:
        "getLegacyWidthFromText uses Arial at 20px and must be <= 620px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["value", "unit"],
      description:
        'getLegacyWidthFromText uses Arial at 103px and must be <= 624px. Measure value.toLocaleString("en-US") followed immediately by the complete unit. An empty unit is permitted. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.',
    },
  ],
  "dot-matrix": [
    {
      id: "fixed-text-slot-1",
      paths: ["groups.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 17px and must be <= 124px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 31px and must be <= 620px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["cohortLabel"],
      description:
        "getLegacyWidthFromText uses Arial at 15px and must be <= 148px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "stagger-cards": [
    {
      id: "fixed-text-slot-1",
      paths: ["cards.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 26px and must be <= 214px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["cards.*.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 16px and must be <= 190px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["heading"],
      description:
        "getLegacyWidthFromText uses Arial at 31px and must be <= 832px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "word-reveal": [
    {
      id: "fixed-text-slot-1",
      paths: ["words.0.word"],
      description:
        "getLegacyWidthFromText uses Arial at 91px and must be <= 232px. Apply only to the authored word at this positional mask. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["words.1.word"],
      description:
        "getLegacyWidthFromText uses Arial at 91px and must be <= 236px. Apply only to the authored word at this positional mask. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-3",
      paths: ["words.2.word"],
      description:
        "getLegacyWidthFromText uses Arial at 137px and must be <= 414px. Apply only to the authored word at this positional mask. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
  "status-cycle": [
    {
      id: "fixed-text-slot-1",
      paths: ["states.*.label"],
      description:
        "getLegacyWidthFromText uses Arial at 37px and must be <= 398px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
    {
      id: "fixed-text-slot-2",
      paths: ["states.*.detail"],
      description:
        "getLegacyWidthFromText uses Arial at 18px and must be <= 398px. Sum ceil(fontSize * advance) per Unicode code point. Use the conservative Arial regular/600-weight advance table, with 1.1em for unmapped code points.",
    },
  ],
};
