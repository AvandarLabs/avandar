import type { Input } from "./StatePreservingSourceRefresh.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
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
};
/** Minimum, concentrated dense and changed authored examples. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
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
    },
  },
  {
    id: "minimum",
    input: {
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
      ],
      sourceRows: [
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
      showWriteCount: false,
      copy: {
        context: "Fictional example",
        before: "Before",
        after: "After",
      },
    },
  },
  {
    id: "dense",
    input: {
      records: [
        {
          id: "aaaaaaaaaa",
          label: "界界界界界界界界界界界界界界界界界界界界",
          status: "界界界界界界界界界界界界界界界界界界界界",
          assignee: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "bbbbbbbbbb",
          label: "界界界界界界界界界界界界界界界界界界界界",
          status: "界界界界界界界界界界界界界界界界界界界界",
          assignee: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "cccccccccc",
          label: "界界界界界界界界界界界界界界界界界界界界",
          status: "界界界界界界界界界界界界界界界界界界界界",
          assignee: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "dddddddddd",
          label: "界界界界界界界界界界界界界界界界界界界界",
          status: "界界界界界界界界界界界界界界界界界界界界",
          assignee: "界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      sourceRows: [
        {
          id: "dddddddddd",
          label: "語語語語語語語語語語語語語語語語語語語語",
        },
        {
          id: "cccccccccc",
          label: "語語語語語語語語語語語語語語語語語語語語",
        },
        {
          id: "bbbbbbbbbb",
          label: "語語語語語語語語語語語語語語語語語語語語",
        },
        {
          id: "aaaaaaaaaa",
          label: "語語語語語語語語語語語語語語語語語語語語",
        },
      ],
      labels: {
        derived:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        human:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        unchanged:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        missing:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      showWriteCount: true,
      copy: {
        context:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        before:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        after:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
    },
  },
  {
    id: "changed",
    input: {
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
          id: "c",
          label: "Site C",
        },
        {
          id: "b",
          label: "Site B",
        },
        {
          id: "a",
          label: "Site A",
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
  },
];
