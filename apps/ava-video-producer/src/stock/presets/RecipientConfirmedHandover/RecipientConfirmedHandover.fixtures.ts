import type { Input } from "./RecipientConfirmedHandover.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  contents: [
    {
      id: "grain",
      label: "Example grain pack",
      symbol: "grain",
      offeredUnits: 3,
      selectedUnits: 2,
    },
    {
      id: "blanket",
      label: "Example blanket",
      symbol: "blanket",
      offeredUnits: 1,
      selectedUnits: 1,
    },
    {
      id: "soap",
      label: "Example soap pack",
      symbol: "soap",
      offeredUnits: 2,
      selectedUnits: 0,
    },
  ],
  participantLabels: {
    recipient: "Household representative",
    deliveryTeam: "Example delivery team",
  },
  receiptLabels: {
    heading: "Example handover",
    acknowledgement: "I checked these quantities",
    recipientCopy: "Household copy",
    teamCopy: "Delivery copy",
    offered: "Offered items",
    selected: "Chosen items",
    retained: "Kept by delivery team",
  },
  acknowledgementMark: "tick",
  initialsText: "AB",
  showQuantityList: true,
  scenarioCaption: "Fictional handover example",
};
/** Changed author input used by the behavioral test. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  acknowledgementMark: "initials",
  initialsText: "XY",
  showQuantityList: false,
};
/** Rejected incomplete, unknown and invalid authored inputs. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, unexpected: true },
  {},
  {
    ...DEFAULT_INPUT,
    contents: [{ ...DEFAULT_INPUT.contents[0], selectedUnits: 4 }],
  },
];

/** Smallest accepted collection example, including literal empty IDs. */
export const MINIMUM_INPUT: Input = {
  contents: [
    {
      id: "",
      label: "",
      symbol: "container",
      offeredUnits: 2,
      selectedUnits: 1,
    },
  ],
  participantLabels: {
    recipient: "Household representative",
    deliveryTeam: "Example delivery team",
  },
  receiptLabels: {
    heading: "Example handover",
    acknowledgement: "I checked these quantities",
    recipientCopy: "Household copy",
    teamCopy: "Delivery copy",
    offered: "Offered items",
    selected: "Chosen items",
    retained: "Kept by delivery team",
  },
  acknowledgementMark: "tick",
  initialsText: "AB",
  showQuantityList: false,
  scenarioCaption: "Fictional handover example",
};
/** Maximum density with full accepted display text. */
export const DENSE_INPUT: Input = {
  contents: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "grain",
      offeredUnits: 4,
      selectedUnits: 4,
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "blanket",
      offeredUnits: 3,
      selectedUnits: 1,
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "soap",
      offeredUnits: 2,
      selectedUnits: 0,
    },
    {
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "container",
      offeredUnits: 1,
      selectedUnits: 0,
    },
  ],
  participantLabels: {
    recipient: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    deliveryTeam: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  receiptLabels: {
    heading: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    acknowledgement: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    recipientCopy: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    teamCopy: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    offered: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    selected: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  acknowledgementMark: "tick",
  initialsText: "AB",
  showQuantityList: true,
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Default, minimal, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: changedInput },
  {
    id: "all-four-counting-rows",
    input: {
      ...DENSE_INPUT,
      contents: DENSE_INPUT.contents.map((content, index) => ({
        ...content,
        selectedUnits: index === 2 ? 2 : 1,
      })),
    },
  },
  {
    id: "dense-initials-hidden-list",
    input: {
      contents: [
        {
          id: "0",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "grain",
          offeredUnits: 4,
          selectedUnits: 4,
        },
        {
          id: "1",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "blanket",
          offeredUnits: 3,
          selectedUnits: 1,
        },
        {
          id: "2",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "soap",
          offeredUnits: 2,
          selectedUnits: 0,
        },
        {
          id: "3",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "container",
          offeredUnits: 1,
          selectedUnits: 0,
        },
      ],
      participantLabels: {
        recipient: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        deliveryTeam: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      receiptLabels: {
        heading: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        acknowledgement: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        recipientCopy: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        teamCopy: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        offered: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        selected: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      acknowledgementMark: "initials",
      initialsText: "WWW",
      showQuantityList: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
];
