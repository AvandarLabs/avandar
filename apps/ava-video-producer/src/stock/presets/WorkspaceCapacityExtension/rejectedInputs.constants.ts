/** Rejection cases cover strict structure and cross-field invariants. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
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
    extra: true,
  },
  {
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
      extra: true,
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
  },
  {
    existingResources: [],
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
  },
  {
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
        id: "s-a",
        label: "Demo books",
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
  },
  {
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
        limit: 2,
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
  },
  {
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
        limit: 5,
      },
      expandedAllowance: {
        label: "Demo expanded allowance",
        limit: 6,
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
  },
  {
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
        limit: 4,
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
  },
];
