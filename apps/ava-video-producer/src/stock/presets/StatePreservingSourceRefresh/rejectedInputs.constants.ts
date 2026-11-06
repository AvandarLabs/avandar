/** Invalid structures and cross-field references. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    records: [
      {
        id: "a",
        label: "Site A",
        status: "In review",
        assignee: "Worker K",
      },
      {
        id: "b",
        label: "Site B",
        status: "Open",
        assignee: "Worker M",
      },
      {
        id: "c",
        label: "Site C",
        status: "Open",
        assignee: "Worker K",
      },
    ],
    sourceRows: [
      {
        id: "a",
        label: "Site A North",
      },
      {
        id: "b",
        label: "Site B",
      },
    ],
    labels: {
      derived: "Source-derived label",
      human: "Human case state",
      unchanged: "No write needed",
      missing: "Missing from this source",
    },
    showWriteCount: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
    extra: true,
  },
  {
    records: [
      {
        id: "a",
        label: "Site A",
        status: "In review",
        assignee: "Worker K",
      },
      {
        id: "a",
        label: "Site A",
        status: "In review",
        assignee: "Worker K",
      },
    ],
    sourceRows: [
      {
        id: "a",
        label: "Site A North",
      },
      {
        id: "b",
        label: "Site B",
      },
    ],
    labels: {
      derived: "Source-derived label",
      human: "Human case state",
      unchanged: "No write needed",
      missing: "Missing from this source",
    },
    showWriteCount: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    records: [
      {
        id: "a",
        label: "Site A",
        status: "In review",
        assignee: "Worker K",
      },
      {
        id: "b",
        label: "Site B",
        status: "Open",
        assignee: "Worker M",
      },
      {
        id: "c",
        label: "Site C",
        status: "Open",
        assignee: "Worker K",
      },
    ],
    sourceRows: [
      {
        id: "new",
        label: "New",
      },
    ],
    labels: {
      derived: "Source-derived label",
      human: "Human case state",
      unchanged: "No write needed",
      missing: "Missing from this source",
    },
    showWriteCount: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    records: [
      {
        id: "a",
        label: "Site A",
        status: "In review",
        assignee: "Worker K",
      },
      {
        id: "b",
        label: "Site B",
        status: "Open",
        assignee: "Worker M",
      },
      {
        id: "c",
        label: "Site C",
        status: "Open",
        assignee: "Worker K",
      },
    ],
    sourceRows: [
      {
        id: "a",
        label: "Site A North",
      },
      {
        id: "a",
        label: "Site A North",
      },
    ],
    labels: {
      derived: "Source-derived label",
      human: "Human case state",
      unchanged: "No write needed",
      missing: "Missing from this source",
    },
    showWriteCount: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    records: [
      {
        id: "a",
        label: "Site A",
        status: "In review",
        assignee: "Worker K",
      },
      {
        id: "b",
        label: "Site B",
        status: "Open",
        assignee: "Worker M",
      },
      {
        id: "c",
        label: "Site C",
        status: "Open",
        assignee: "Worker K",
      },
    ],
    sourceRows: [],
    labels: {
      derived: "Source-derived label",
      human: "Human case state",
      unchanged: "No write needed",
      missing: "Missing from this source",
    },
    showWriteCount: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
];
