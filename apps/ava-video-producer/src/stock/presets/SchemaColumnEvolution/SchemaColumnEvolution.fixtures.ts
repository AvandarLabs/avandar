import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SchemaColumnEvolution.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  earlierRecords: [
    {
      id: "r-a",
      label: "Demo record A",
      recordedValue: "North",
    },
    {
      id: "r-b",
      label: "Demo record B",
      recordedValue: "South",
    },
  ],
  fields: {
    existingLabel: "Site",
    addedLabel: "Visit mode",
    missingLabel: "Not collected",
  },
  laterRecord: {
    id: "r-c",
    label: "Demo record C",
    recordedValue: "East",
    addedValue: "In person",
  },
  phaseLabels: {
    before: "Earlier collection",
    expanded: "One question added",
    later: "Later record arrives",
  },
  showVersionLabels: true,
  evidenceLabel: "Fictional records; no historical backfill",
};
/** Minimum collection sizes and accepted zero quantities. */
export const MINIMUM_INPUT: Input = {
  earlierRecords: [
    {
      id: " ",
      label: "Demo record A",
      recordedValue: "North",
    },
  ],
  fields: {
    existingLabel: "Site",
    addedLabel: "Visit mode",
    missingLabel: "Not collected",
  },
  laterRecord: {
    id: "界",
    label: "Demo record C",
    recordedValue: "East",
    addedValue: null,
  },
  phaseLabels: {
    before: "Earlier collection",
    expanded: "One question added",
    later: "Later record arrives",
  },
  showVersionLabels: false,
  evidenceLabel: "Fictional records; no historical backfill",
};
/** Maximum collection density and full display text bounds. */
export const DENSE_INPUT: Input = {
  earlierRecords: [
    {
      id: "r-aWWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      recordedValue: "WWWWWWWWWWWWWWWWWW",
    },
    {
      id: "r-bWWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      recordedValue: "WWWWWWWWWWWWWWWWWW",
    },
    {
      id: "r-dWWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      recordedValue: "WWWWWWWWWWWWWWWWWW",
    },
  ],
  fields: {
    existingLabel: "WWWWWWWWWWWWWWWWWWWW",
    addedLabel: "WWWWWWWWWWWWWWWWWWWW",
    missingLabel: "WWWWWWWWWWWWWWWWWWWW",
  },
  laterRecord: {
    id: "r-cWWWWWWWWWWWWW",
    label: "WWWWWWWWWWWWWWWWWWWWWW",
    recordedValue: "WWWWWWWWWWWWWWWWWW",
    addedValue: "In person",
  },
  phaseLabels: {
    before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    expanded: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    later: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showVersionLabels: true,
  evidenceLabel:
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Changed membership, choice, or measurement display. */
export const CHANGED_INPUT: Input = {
  earlierRecords: [
    {
      id: "r-a",
      label: "Demo record A",
      recordedValue: "North",
    },
    {
      id: "r-b",
      label: "Demo record B",
      recordedValue: "South",
    },
  ],
  fields: {
    existingLabel: "Site",
    addedLabel: "Visit mode",
    missingLabel: "Not collected",
  },
  laterRecord: {
    id: "r-c",
    label: "Demo record C",
    recordedValue: "East",
    addedValue: null,
  },
  phaseLabels: {
    before: "Earlier collection",
    expanded: "One question added",
    later: "Later record arrives",
  },
  showVersionLabels: false,
  evidenceLabel: "Fictional records; no historical backfill",
};
/** Rejection cases cover strict structure and cross-field invariants. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    earlierRecords: [
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-b",
        label: "Demo record B",
        recordedValue: "South",
      },
    ],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
    },
    laterRecord: {
      id: "r-c",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
    extra: true,
  },
  {
    earlierRecords: [
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-b",
        label: "Demo record B",
        recordedValue: "South",
      },
    ],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
      extra: true,
    },
    laterRecord: {
      id: "r-c",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
  },
  {
    earlierRecords: [],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
    },
    laterRecord: {
      id: "r-c",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
  },
  {
    earlierRecords: [
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
    ],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
    },
    laterRecord: {
      id: "r-c",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
  },
  {
    earlierRecords: [
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-b",
        label: "Demo record B",
        recordedValue: "South",
      },
    ],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
    },
    laterRecord: {
      id: "r-a",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
  },
  {
    earlierRecords: [
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
    ],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
    },
    laterRecord: {
      id: "r-c",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
  },
  {
    earlierRecords: [
      {
        id: "r-a",
        label: "Demo record A",
        recordedValue: "North",
      },
      {
        id: "r-b",
        label: "Demo record B",
        recordedValue: "South",
      },
    ],
    fields: {
      existingLabel: "Site",
      addedLabel: "Visit mode",
      missingLabel: "Not collected",
    },
    laterRecord: {
      id: "",
      label: "Demo record C",
      recordedValue: "East",
      addedValue: "In person",
    },
    phaseLabels: {
      before: "Earlier collection",
      expanded: "One question added",
      later: "Later record arrives",
    },
    showVersionLabels: true,
    evidenceLabel: "Fictional records; no historical backfill",
  },
];
/** Complete fixtures for deterministic rendering and text stress. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
