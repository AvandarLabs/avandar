import type { Input } from "./ResidentBudgetBallots.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  projects: [
    {
      id: "bench",
      label: "Demo seating project",
      symbol: "bench",
    },
    {
      id: "books",
      label: "Demo reading project",
      symbol: "books",
    },
  ],
  ballots: [
    {
      id: "b1",
      projectId: "bench",
    },
    {
      id: "b2",
      projectId: "books",
    },
    {
      id: "b3",
      projectId: "bench",
    },
    {
      id: "b4",
      projectId: null,
    },
  ],
  labels: {
    choices: "Demo project choices",
    box: "Ballot box",
    tally: "Preferences counted",
    abstained: "Abstained",
    unit: "Ballots",
    example: "Fictional budget consultation",
  },
  showTotals: true,
  tallyArrangement: "stacks",
  closingNote: "Preferences are not a funding award",
};
/** Minimum, dense and changed complete authored inputs. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      projects: [
        {
          id: "",
          label: "",
          symbol: "bench",
        },
        {
          id: "books",
          label: "Demo reading project",
          symbol: "books",
        },
      ],
      ballots: [
        {
          id: "",
          projectId: "",
        },
        {
          id: "b2",
          projectId: null,
        },
      ],
      labels: {
        choices: "Demo project choices",
        box: "Ballot box",
        tally: "Preferences counted",
        abstained: "Abstained",
        unit: "Ballots",
        example: "Fictional budget consultation",
      },
      showTotals: false,
      tallyArrangement: "rows",
      closingNote: "No award",
    },
  },
  {
    id: "dense",
    input: {
      projects: [
        {
          id: "bench",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "bench",
        },
        {
          id: "books",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "books",
        },
        {
          id: "garden",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "garden",
        },
      ],
      ballots: [
        {
          id: "b0",
          projectId: "bench",
        },
        {
          id: "b1",
          projectId: "bench",
        },
        {
          id: "b2",
          projectId: "bench",
        },
        {
          id: "b3",
          projectId: "bench",
        },
        {
          id: "b4",
          projectId: "bench",
        },
        {
          id: "b5",
          projectId: "bench",
        },
        {
          id: "b6",
          projectId: "bench",
        },
        {
          id: "b7",
          projectId: "bench",
        },
      ],
      labels: {
        choices: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        box: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        tally: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        abstained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        unit: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showTotals: true,
      tallyArrangement: "stacks",
      closingNote: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "changed",
    input: {
      projects: [
        {
          id: "bench",
          label: "Demo seating project",
          symbol: "bench",
        },
        {
          id: "books",
          label: "Demo reading project",
          symbol: "books",
        },
        {
          id: "garden",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "garden",
        },
      ],
      ballots: [
        {
          id: "b0",
          projectId: null,
        },
        {
          id: "b1",
          projectId: null,
        },
        {
          id: "b2",
          projectId: null,
        },
        {
          id: "b3",
          projectId: null,
        },
        {
          id: "b4",
          projectId: null,
        },
        {
          id: "b5",
          projectId: null,
        },
        {
          id: "b6",
          projectId: null,
        },
        {
          id: "b7",
          projectId: null,
        },
      ],
      labels: {
        choices: "Demo project choices",
        box: "Ballot box",
        tally: "Preferences counted",
        abstained: "Abstained",
        unit: "Ballots",
        example: "Fictional budget consultation",
      },
      showTotals: true,
      tallyArrangement: "rows",
      closingNote: "Preferences are not a funding award",
    },
  },
];
/** Strict and semantic rejection cases. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    projects: [
      {
        id: "bench",
        label: "Demo seating project",
        symbol: "bench",
      },
      {
        id: "books",
        label: "Demo reading project",
        symbol: "books",
      },
    ],
    ballots: [
      {
        id: "b1",
        projectId: "bench",
      },
      {
        id: "b2",
        projectId: "books",
      },
      {
        id: "b3",
        projectId: "bench",
      },
      {
        id: "b4",
        projectId: null,
      },
    ],
    labels: {
      choices: "Demo project choices",
      box: "Ballot box",
      tally: "Preferences counted",
      abstained: "Abstained",
      unit: "Ballots",
      example: "Fictional budget consultation",
    },
    showTotals: true,
    tallyArrangement: "stacks",
    closingNote: "Preferences are not a funding award",
    extra: true,
  },
  {
    projects: [
      {
        id: "bench",
        label: "Demo seating project",
        symbol: "bench",
      },
      {
        id: "books",
        label: "Demo reading project",
        symbol: "books",
      },
    ],
    ballots: [
      {
        id: "a",
        projectId: "missing",
      },
      {
        id: "b",
        projectId: null,
      },
    ],
    labels: {
      choices: "Demo project choices",
      box: "Ballot box",
      tally: "Preferences counted",
      abstained: "Abstained",
      unit: "Ballots",
      example: "Fictional budget consultation",
    },
    showTotals: true,
    tallyArrangement: "stacks",
    closingNote: "Preferences are not a funding award",
  },
  {
    projects: [
      {
        id: "bench",
        label: "Demo seating project",
        symbol: "bench",
      },
      {
        id: "books",
        label: "Demo reading project",
        symbol: "books",
      },
    ],
    ballots: [
      {
        id: "b1",
        projectId: "bench",
      },
      {
        id: "b1",
        projectId: "bench",
      },
    ],
    labels: {
      choices: "Demo project choices",
      box: "Ballot box",
      tally: "Preferences counted",
      abstained: "Abstained",
      unit: "Ballots",
      example: "Fictional budget consultation",
    },
    showTotals: true,
    tallyArrangement: "stacks",
    closingNote: "Preferences are not a funding award",
  },
  {
    projects: [
      {
        id: "bench",
        label: "Demo seating project",
        symbol: "bench",
      },
      {
        id: "bench",
        label: "Demo seating project",
        symbol: "bench",
      },
    ],
    ballots: [
      {
        id: "b1",
        projectId: "bench",
      },
      {
        id: "b2",
        projectId: "books",
      },
      {
        id: "b3",
        projectId: "bench",
      },
      {
        id: "b4",
        projectId: null,
      },
    ],
    labels: {
      choices: "Demo project choices",
      box: "Ballot box",
      tally: "Preferences counted",
      abstained: "Abstained",
      unit: "Ballots",
      example: "Fictional budget consultation",
    },
    showTotals: true,
    tallyArrangement: "stacks",
    closingNote: "Preferences are not a funding award",
  },
];
