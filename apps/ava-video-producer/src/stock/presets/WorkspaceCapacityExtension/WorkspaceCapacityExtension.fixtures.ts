import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./WorkspaceCapacityExtension.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  existingResources: [
    {
      id: "s-a",
      label: "Demo books",
    },
    {
      id: "s-b",
      label: "Demo tools",
    },
    {
      id: "s-c",
      label: "Demo visits",
    },
  ],
  requestedResources: [
    {
      id: "s-d",
      label: "Demo events",
    },
    {
      id: "s-e",
      label: "Demo loans",
    },
  ],
  allowances: {
    currentAllowance: {
      label: "Demo starter allowance",
      limit: 3,
    },
    expandedAllowance: {
      label: "Demo expanded allowance",
      limit: 5,
    },
  },
  choice: {
    decision: "expand",
    label: "Team chooses more capacity",
  },
  copy: {
    workspace: "Fictional shared workspace",
    pending: "Requested resources",
    capacity: "Resource slots",
    retained: "Existing work retained",
    example: "Fictional plans; no payment processed",
  },
  showResourceLabels: true,
};
/** Minimum collection sizes and accepted zero quantities. */
export const MINIMUM_INPUT: Input = {
  existingResources: [
    {
      id: " ",
      label: "Demo books",
    },
  ],
  requestedResources: [
    {
      id: "界",
      label: "Demo events",
    },
  ],
  allowances: {
    currentAllowance: {
      label: "Demo starter allowance",
      limit: 1,
    },
    expandedAllowance: {
      label: "Demo expanded allowance",
      limit: 2,
    },
  },
  choice: {
    decision: "keep",
    label: "Team keeps current capacity",
  },
  copy: {
    workspace: "Fictional shared workspace",
    pending: "Requested resources",
    capacity: "Resource slots",
    retained: "Existing work retained",
    example: "Fictional plans; no payment processed",
  },
  showResourceLabels: false,
};
/** Maximum collection density and full display text bounds. */
export const DENSE_INPUT: Input = {
  existingResources: [
    {
      id: "e-0WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "e-1WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "e-2WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "e-3WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "e-4WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "e-5WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
  ],
  requestedResources: [
    {
      id: "r-0WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "r-1WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
    {
      id: "r-2WWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWW",
    },
  ],
  allowances: {
    currentAllowance: {
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      limit: 6,
    },
    expandedAllowance: {
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      limit: 9,
    },
  },
  choice: {
    decision: "expand",
    label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  copy: {
    workspace: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    pending: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    capacity: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showResourceLabels: true,
};
/** Changed membership, choice, or measurement display. */
export const CHANGED_INPUT: Input = {
  existingResources: [
    {
      id: "s-a",
      label: "Demo books",
    },
    {
      id: "s-b",
      label: "Demo tools",
    },
    {
      id: "s-c",
      label: "Demo visits",
    },
  ],
  requestedResources: [
    {
      id: "s-d",
      label: "Demo events",
    },
    {
      id: "s-e",
      label: "Demo loans",
    },
  ],
  allowances: {
    currentAllowance: {
      label: "Demo starter allowance",
      limit: 3,
    },
    expandedAllowance: {
      label: "Demo expanded allowance",
      limit: 5,
    },
  },
  choice: {
    decision: "keep",
    label: "Team keeps current capacity",
  },
  copy: {
    workspace: "Fictional shared workspace",
    pending: "Requested resources",
    capacity: "Resource slots",
    retained: "Existing work retained",
    example: "Fictional plans; no payment processed",
  },
  showResourceLabels: false,
};

/** Complete fixtures for deterministic rendering and text stress. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
