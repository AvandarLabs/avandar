/** Rejection cases cover strict structure and cross-field invariants. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
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
    extra: true,
  },
  {
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
      extra: true,
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
  },
  {
    records: [],
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
  },
  {
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
  },
  {
    records: [
      {
        id: "demo-1",
        categoryId: "absent",
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
  },
  {
    records: [
      {
        id: "demo-1",
        categoryId: "book",
      },
      {
        id: "demo-1",
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
  },
  {
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
        id: "book",
        label: "Books",
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
  },
];
