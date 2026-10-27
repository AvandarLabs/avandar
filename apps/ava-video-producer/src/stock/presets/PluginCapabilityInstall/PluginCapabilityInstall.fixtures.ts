import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./PluginCapabilityInstall.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  records: [
    {
      id: "demo-1",
      categoryId: "book",
    },
    {
      id: "demo-2",
      categoryId: "tool",
    },
    {
      id: "demo-3",
      categoryId: "book",
    },
    {
      id: "demo-4",
      categoryId: "book",
    },
  ],
  categories: [
    {
      id: "book",
      label: "Books",
    },
    {
      id: "tool",
      label: "Tools",
    },
  ],
  utility: {
    label: "Demo count utility",
    fieldLabel: "Category",
    operationLabel: "Count by category",
  },
  installation: {
    choice: "install",
    decisionLabel: "Team chooses to install",
  },
  copy: {
    workspace: "Demo lending workspace",
    records: "Retained source records",
    emptySocket: "Optional tool position",
    installed: "Utility available",
    deferred: "Install deferred",
    result: "Records by category",
    example: "Fictional modular-tool example",
  },
  showRecordIds: true,
};
/** Minimum collection sizes and accepted zero quantities. */
export const MINIMUM_INPUT: Input = {
  records: [
    {
      id: "界",
      categoryId: " ",
    },
  ],
  categories: [
    {
      id: " ",
      label: "Books",
    },
    {
      id: "tool",
      label: "Tools",
    },
  ],
  utility: {
    label: "Demo count utility",
    fieldLabel: "Category",
    operationLabel: "Count by category",
  },
  installation: {
    choice: "defer",
    decisionLabel: "Team defers installation",
  },
  copy: {
    workspace: "Demo lending workspace",
    records: "Retained source records",
    emptySocket: "Optional tool position",
    installed: "Utility available",
    deferred: "Install deferred",
    result: "Records by category",
    example: "Fictional modular-tool example",
  },
  showRecordIds: false,
};
/** Maximum collection density and full display text bounds. */
export const DENSE_INPUT: Input = {
  records: [
    {
      id: "demo-1WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-2WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-3WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-4WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-5WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-6WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-7WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
    {
      id: "demo-8WWWWWWWWWW",
      categoryId: "bookWWWWWWWWWWWW",
    },
  ],
  categories: [
    {
      id: "bookWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWW",
    },
    {
      id: "toolWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWW",
    },
    {
      id: "emptyWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWW",
    },
  ],
  utility: {
    label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    fieldLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    operationLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  installation: {
    choice: "install",
    decisionLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  copy: {
    workspace: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    records: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    emptySocket: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    installed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    deferred: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    result: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showRecordIds: true,
};
/** Changed membership, choice, or measurement display. */
export const CHANGED_INPUT: Input = {
  records: [
    {
      id: "demo-1",
      categoryId: "tool",
    },
    {
      id: "demo-2",
      categoryId: "tool",
    },
    {
      id: "demo-3",
      categoryId: "book",
    },
    {
      id: "demo-4",
      categoryId: "book",
    },
  ],
  categories: [
    {
      id: "book",
      label: "Books",
    },
    {
      id: "tool",
      label: "Tools",
    },
  ],
  utility: {
    label: "Demo count utility",
    fieldLabel: "Category",
    operationLabel: "Count by category",
  },
  installation: {
    choice: "install",
    decisionLabel: "Team chooses to install",
  },
  copy: {
    workspace: "Demo lending workspace",
    records: "Retained source records",
    emptySocket: "Optional tool position",
    installed: "Utility available",
    deferred: "Install deferred",
    result: "Records by category",
    example: "Fictional modular-tool example",
  },
  showRecordIds: true,
};

/** Complete fixtures for deterministic rendering and text stress. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
