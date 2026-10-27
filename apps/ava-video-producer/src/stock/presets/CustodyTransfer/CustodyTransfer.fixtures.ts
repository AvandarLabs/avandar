import type { Input } from "./CustodyTransfer.schema";

/** Complete fictional handoff used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  holders: {
    sender: "Example morning team",
    recipient: "Example evening team",
  },
  object: {
    label: "Example shift brief",
    details: ["Blue shed", "Crate labels"],
  },
  outcome: "accepted",
  copy: {
    offered: "Handoff offered",
    accepted: "Recipient accepted",
    waiting: "Awaiting acceptance",
    responsible: "Responsible holder",
    example: "Fictional example",
  },
  objectShape: "folio",
  showResponsibilityMarker: true,
  showLabels: true,
};

/** Minimum, dense and changed cases preserve the accepted complete input. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      holders: { sender: "A", recipient: "B" },
      object: { label: "C", details: [] },
      objectShape: "key",
      showLabels: false,
      showResponsibilityMarker: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      holders: { sender: "M".repeat(28), recipient: "W".repeat(28) },
      object: {
        label: "M".repeat(28),
        details: Array.from({ length: 3 }, () => "W".repeat(28)),
      },
      copy: {
        offered: "M".repeat(30),
        accepted: "W".repeat(30),
        waiting: "M".repeat(30),
        responsible: "W".repeat(30),
        example: "M".repeat(30),
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      holders: { sender: "Example lab", recipient: "Example archive" },
      object: { label: "Example sample", details: ["Tray seven"] },
      outcome: "awaiting-acceptance",
      objectShape: "baton",
    },
  },
];
