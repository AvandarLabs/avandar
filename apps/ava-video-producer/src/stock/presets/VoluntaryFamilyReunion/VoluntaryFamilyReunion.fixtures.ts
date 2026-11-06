import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./VoluntaryFamilyReunion.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  groups: [
    {
      id: "a",
      label: "Example family group A",
      members: [
        {
          id: "a1",
          label: "Member A",
        },
        {
          id: "a2",
          label: "Member B",
        },
      ],
    },
    {
      id: "b",
      label: "Example family group B",
      members: [
        {
          id: "b1",
          label: "Member C",
        },
      ],
    },
  ],
  meetingLabel: "Example community meeting place",
  invitationLabels: {
    heading: "Proposed meeting",
    acceptance: "We agree to meet",
  },
  greeting: "wave",
  showMemberLabels: false,
  scenarioCaption: "Fictional reunion. Schematic setting.",
};
/** Smallest accepted example, including literal empty identifiers. */
export const MINIMUM_INPUT: Input = {
  groups: [
    {
      id: "",
      label: "",
      members: [
        {
          id: "",
          label: "",
        },
      ],
    },
    {
      id: "路 2",
      label: "",
      members: [
        {
          id: "路 2",
          label: "",
        },
      ],
    },
  ],
  meetingLabel: "Example community meeting place",
  invitationLabels: {
    heading: "Proposed meeting",
    acceptance: "We agree to meet",
  },
  greeting: "wave",
  showMemberLabels: false,
  scenarioCaption: "Fictional reunion. Schematic setting.",
};
/** Maximum collection density and accepted display lengths. */
export const DENSE_INPUT: Input = {
  groups: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      members: [
        {
          id: "0-0",
          label: "WWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "0-1",
          label: "WWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "0-2",
          label: "WWWWWWWWWWWWWWWWWWWW",
        },
      ],
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      members: [
        {
          id: "1-0",
          label: "WWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "1-1",
          label: "WWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "1-2",
          label: "WWWWWWWWWWWWWWWWWWWW",
        },
      ],
    },
  ],
  meetingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  invitationLabels: {
    heading: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    acceptance: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  greeting: "wave",
  showMemberLabels: true,
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Changed authored choices, quantities and optional presentation. */
export const CHANGED_INPUT: Input = {
  groups: [
    {
      id: "a",
      label: "Example family group A",
      members: [
        {
          id: "a1",
          label: "Member A",
        },
        {
          id: "a2",
          label: "Member B",
        },
        {
          id: "a3",
          label: "Member D",
        },
      ],
    },
    {
      id: "b",
      label: "Example family group B",
      members: [
        {
          id: "b1",
          label: "Member C",
        },
      ],
    },
  ],
  meetingLabel: "Example community meeting place",
  invitationLabels: {
    heading: "Proposed meeting",
    acceptance: "We agree to meet",
  },
  greeting: "open-arms",
  showMemberLabels: true,
  scenarioCaption: "Fictional reunion. Schematic setting.",
};
/** Invalid complete documents and malformed collections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, groups: [] },
  {
    ...DEFAULT_INPUT,
    groups: [DEFAULT_INPUT.groups[0], DEFAULT_INPUT.groups[0]],
  },
  {
    ...DEFAULT_INPUT,
    groups: [
      DEFAULT_INPUT.groups[0],
      {
        ...DEFAULT_INPUT.groups[1],
        members: [DEFAULT_INPUT.groups[0].members[0]],
      },
    ],
  },
  { ...DEFAULT_INPUT, greeting: "merge" },
  {
    ...DEFAULT_INPUT,
    groups: [
      { ...DEFAULT_INPUT.groups[0], extra: true },
      ...DEFAULT_INPUT.groups.slice(1),
    ],
  },
];
/** Stable complete accepted examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
