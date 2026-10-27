import type { Input } from "./OrderedLockAcquisition.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  resources: [
    {
      id: "a",
      label: "Table A",
    },
    {
      id: "b",
      label: "Table B",
    },
  ],
  operations: [
    {
      id: "one",
      label: "Operation 1",
      requestedIds: ["a", "b"],
    },
    {
      id: "two",
      label: "Operation 2",
      requestedIds: ["b", "a"],
    },
  ],
  firstOperationId: "one",
  showOriginalOrder: true,
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
      resources: [
        {
          id: "a",
          label: "Table A",
        },
        {
          id: "b",
          label: "Table B",
        },
      ],
      operations: [
        {
          id: "one",
          label: "Operation 1",
          requestedIds: ["a", "b"],
        },
        {
          id: "two",
          label: "Operation 2",
          requestedIds: ["b", "a"],
        },
      ],
      firstOperationId: "one",
      showOriginalOrder: true,
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
      resources: [
        {
          id: "雪",
          label: "R",
        },
        {
          id: " ",
          label: "S",
        },
      ],
      operations: [
        {
          id: "α",
          label: "P",
          requestedIds: ["雪", " "],
        },
        {
          id: "β",
          label: "Q",
          requestedIds: [" ", "雪"],
        },
      ],
      firstOperationId: "β",
      showOriginalOrder: false,
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
      resources: [
        {
          id: "rrrrrrrrrr",
          label: "界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "ssssssssss",
          label: "界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      operations: [
        {
          id: "pppppppppppp",
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
          requestedIds: ["rrrrrrrrrr", "ssssssssss"],
        },
        {
          id: "qqqqqqqqqqqq",
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
          requestedIds: ["ssssssssss", "rrrrrrrrrr"],
        },
      ],
      firstOperationId: "pppppppppppp",
      showOriginalOrder: true,
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
      resources: [
        {
          id: "b",
          label: "Table B",
        },
        {
          id: "a",
          label: "Table A",
        },
      ],
      operations: [
        {
          id: "one",
          label: "Operation 1",
          requestedIds: ["a", "b"],
        },
        {
          id: "two",
          label: "Operation 2",
          requestedIds: ["b", "a"],
        },
      ],
      firstOperationId: "two",
      showOriginalOrder: true,
      copy: {
        context: "Fictional example",
        before: "Before",
        after: "After",
      },
    },
  },
];
/** Invalid structures and cross-field references. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
      {
        id: "b",
        label: "Table B",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
      {
        id: "two",
        label: "Operation 2",
        requestedIds: ["b", "a"],
      },
    ],
    firstOperationId: "one",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
    extra: true,
  },
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
      {
        id: "b",
        label: "Table B",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
      {
        id: "two",
        label: "Operation 2",
        requestedIds: ["b", "a"],
      },
    ],
    firstOperationId: "absent",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
      {
        id: "two",
        label: "Operation 2",
        requestedIds: ["b", "a"],
      },
    ],
    firstOperationId: "one",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
      {
        id: "a",
        label: "Table A",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
      {
        id: "two",
        label: "Operation 2",
        requestedIds: ["b", "a"],
      },
    ],
    firstOperationId: "one",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
      {
        id: "b",
        label: "Table B",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
    ],
    firstOperationId: "one",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
      {
        id: "b",
        label: "Table B",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "b"],
      },
      {
        id: "two",
        label: "Operation 2",
        requestedIds: ["a", "b"],
      },
    ],
    firstOperationId: "one",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
  {
    resources: [
      {
        id: "a",
        label: "Table A",
      },
      {
        id: "b",
        label: "Table B",
      },
    ],
    operations: [
      {
        id: "one",
        label: "Operation 1",
        requestedIds: ["a", "x"],
      },
      {
        id: "two",
        label: "Operation 2",
        requestedIds: ["b", "a"],
      },
    ],
    firstOperationId: "one",
    showOriginalOrder: true,
    copy: {
      context: "Fictional example",
      before: "Before",
      after: "After",
    },
  },
];
