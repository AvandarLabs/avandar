/** Invalid structures and cross-field references. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "b",
        label: "Site B",
      },
      {
        id: "c",
        label: "Site C",
      },
    ],
    observations: [
      {
        id: "o1",
        entityId: "a",
        value: 2,
      },
      {
        id: "o2",
        entityId: "a",
        value: 3,
      },
      {
        id: "o3",
        entityId: "b",
        value: 4,
      },
    ],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
    extra: true,
  },
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "a",
        label: "Site A",
      },
    ],
    observations: [
      {
        id: "o1",
        entityId: "a",
        value: 2,
      },
      {
        id: "o2",
        entityId: "a",
        value: 3,
      },
      {
        id: "o3",
        entityId: "b",
        value: 4,
      },
    ],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "b",
        label: "Site B",
      },
      {
        id: "c",
        label: "Site C",
      },
    ],
    observations: [
      {
        id: "o",
        entityId: "absent",
        value: 1,
      },
    ],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "b",
        label: "Site B",
      },
      {
        id: "c",
        label: "Site C",
      },
    ],
    observations: [
      {
        id: "ooooooooooooo",
        entityId: "a",
        value: 1,
      },
    ],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "b",
        label: "Site B",
      },
      {
        id: "c",
        label: "Site C",
      },
    ],
    observations: [
      {
        id: "o1",
        entityId: "a",
        value: 2,
      },
      {
        id: "o1",
        entityId: "a",
        value: 2,
      },
    ],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "b",
        label: "Site B",
      },
      {
        id: "c",
        label: "Site C",
      },
    ],
    observations: [
      {
        id: "o",
        entityId: "a",
        value: 101,
      },
    ],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    entities: [
      {
        id: "a",
        label: "Site A",
      },
      {
        id: "b",
        label: "Site B",
      },
      {
        id: "c",
        label: "Site C",
      },
    ],
    observations: [],
    field: {
      label: "Recorded items",
      unit: "items",
      missingLabel: "No observation",
    },
    showSourceRows: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
];
