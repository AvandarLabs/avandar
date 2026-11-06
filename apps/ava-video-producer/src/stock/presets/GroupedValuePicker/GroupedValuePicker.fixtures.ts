import type { Input } from "./GroupedValuePicker.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  observations: [
    {
      id: "a",
      value: 2,
    },
    {
      id: "b",
      value: 4,
    },
    {
      id: "c",
      value: 4,
    },
    {
      id: "d",
      value: null,
    },
  ],
  rule: "most-frequent",
  nullPolicy: "exclude-from-mode",
  labels: {
    entity: "Fictional Site A",
    field: "Recorded items",
    unit: "items",
    missing: "Missing",
    result: "Derived field",
    countUnit: "observations",
  },
  showCalculation: true,
};
/** Minimum, concentrated dense and changed authored examples. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      observations: [
        {
          id: "a",
          value: 2,
        },
        {
          id: "b",
          value: 4,
        },
        {
          id: "c",
          value: 4,
        },
        {
          id: "d",
          value: null,
        },
      ],
      rule: "most-frequent",
      nullPolicy: "exclude-from-mode",
      labels: {
        entity: "Fictional Site A",
        field: "Recorded items",
        unit: "items",
        missing: "Missing",
        result: "Derived field",
        countUnit: "observations",
      },
      showCalculation: true,
    },
  },
  {
    id: "minimum",
    input: {
      observations: [
        {
          id: "雪",
          value: 0,
        },
        {
          id: " ",
          value: null,
        },
      ],
      rule: "first",
      nullPolicy: "exclude-from-mode",
      labels: {
        entity: "Fictional Site A",
        field: "Recorded items",
        unit: "items",
        missing: "Missing",
        result: "Derived field",
        countUnit: "observations",
      },
      showCalculation: false,
    },
  },
  {
    id: "dense",
    input: {
      observations: [
        {
          id: "000000000000",
          value: -100,
        },
        {
          id: "000000000001",
          value: 0,
        },
        {
          id: "000000000002",
          value: 100,
        },
        {
          id: "000000000003",
          value: null,
        },
        {
          id: "000000000004",
          value: null,
        },
        {
          id: "000000000005",
          value: 100,
        },
      ],
      rule: "most-frequent",
      nullPolicy: "exclude-from-mode",
      labels: {
        entity: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
        field: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
        unit: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
        missing: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
        result: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
        countUnit: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      showCalculation: true,
    },
  },
  {
    id: "changed",
    input: {
      observations: [
        {
          id: "x",
          value: null,
        },
        {
          id: "y",
          value: null,
        },
        {
          id: "z",
          value: 0,
        },
      ],
      rule: "most-frequent",
      nullPolicy: "include-in-mode",
      labels: {
        entity: "Fictional Site A",
        field: "Recorded items",
        unit: "items",
        missing: "Missing",
        result: "Derived field",
        countUnit: "observations",
      },
      showCalculation: true,
    },
  },
];
/** Invalid structures and cross-field references. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    observations: [
      {
        id: "a",
        value: 2,
      },
      {
        id: "b",
        value: 4,
      },
      {
        id: "c",
        value: 4,
      },
      {
        id: "d",
        value: null,
      },
    ],
    rule: "most-frequent",
    nullPolicy: "exclude-from-mode",
    labels: {
      entity: "Fictional Site A",
      field: "Recorded items",
      unit: "items",
      missing: "Missing",
      result: "Derived field",
      countUnit: "observations",
    },
    showCalculation: true,
    extra: true,
  },
  {
    observations: [
      {
        id: "a",
        value: null,
      },
      {
        id: "b",
        value: null,
      },
    ],
    rule: "most-frequent",
    nullPolicy: "exclude-from-mode",
    labels: {
      entity: "Fictional Site A",
      field: "Recorded items",
      unit: "items",
      missing: "Missing",
      result: "Derived field",
      countUnit: "observations",
    },
    showCalculation: true,
  },
  {
    observations: [
      {
        id: "a",
        value: 2,
      },
      {
        id: "a",
        value: 2,
      },
    ],
    rule: "most-frequent",
    nullPolicy: "exclude-from-mode",
    labels: {
      entity: "Fictional Site A",
      field: "Recorded items",
      unit: "items",
      missing: "Missing",
      result: "Derived field",
      countUnit: "observations",
    },
    showCalculation: true,
  },
  {
    observations: [
      {
        id: "a",
        value: 101,
      },
      {
        id: "b",
        value: 0,
      },
    ],
    rule: "most-frequent",
    nullPolicy: "exclude-from-mode",
    labels: {
      entity: "Fictional Site A",
      field: "Recorded items",
      unit: "items",
      missing: "Missing",
      result: "Derived field",
      countUnit: "observations",
    },
    showCalculation: true,
  },
  {
    observations: [
      {
        id: "a",
        value: 2,
      },
      {
        id: "b",
        value: 4,
      },
      {
        id: "c",
        value: 4,
      },
      {
        id: "d",
        value: null,
      },
    ],
    rule: "median",
    nullPolicy: "exclude-from-mode",
    labels: {
      entity: "Fictional Site A",
      field: "Recorded items",
      unit: "items",
      missing: "Missing",
      result: "Derived field",
      countUnit: "observations",
    },
    showCalculation: true,
  },
];
