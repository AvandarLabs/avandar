import type { Input } from "./EntitySpineAssembly.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
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
};
/** Minimum, concentrated dense and changed authored examples. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
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
    },
  },
  {
    id: "minimum",
    input: {
      entities: [
        {
          id: "a",
          label: "Site A",
        },
        {
          id: "b",
          label: "Site B",
        },
      ],
      observations: [
        {
          id: "",
          entityId: "a",
          value: 0,
        },
      ],
      field: {
        label: "Recorded items",
        unit: "items",
        missingLabel: "No observation",
      },
      showSourceRows: false,
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
      entities: [
        {
          id: "aaaaaaaaaa",
          label: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "bbbbbbbbbb",
          label: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "cccccccccc",
          label: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "dddddddddd",
          label: "界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      observations: [
        {
          id: "000000000000",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
        {
          id: "000000000001",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
        {
          id: "000000000002",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
        {
          id: "000000000003",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
        {
          id: "000000000004",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
        {
          id: "000000000005",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
        {
          id: "000000000006",
          entityId: "aaaaaaaaaa",
          value: 100,
        },
      ],
      field: {
        label: "界界界界界界界界界界界界界界界界界界界界界界界界",
        unit: "界界界界界界界界界界界界界界界界界界界界界界界界",
        missingLabel: "界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      showSourceRows: true,
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
        {
          id: "o4",
          entityId: "a",
          value: 7,
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
  },
];
