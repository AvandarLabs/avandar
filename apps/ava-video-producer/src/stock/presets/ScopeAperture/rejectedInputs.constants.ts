import { DEFAULT_INPUT } from "./ScopeAperture.fixtures";

/** Strict keys, text bounds, collection limits, and membership rejections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, broadTopic: null },
  {
    ...DEFAULT_INPUT,
    broadTopic: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "Lighting",
        included: false,
        extra: true,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
        extra: true,
      },
      {
        id: "light",
        label: "Lighting",
        included: false,
        extra: true,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    focusedQuestion: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  },
  { ...DEFAULT_INPUT, outsideLabel: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { ...DEFAULT_INPUT, insideLabel: "XXXXXXXXXXXXXXXXXXXXXXXXX" },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "Lighting",
        included: false,
      },
      {
        id: "shelves",
        label: "Storage shelves",
        included: false,
      },
      {
        id: "bins",
        label: "Supply bins",
        included: false,
      },
      {
        id: "seating",
        label: "Seating",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "Lighting",
        included: true,
      },
      {
        id: "shelves",
        label: "Storage shelves",
        included: true,
      },
      {
        id: "bins",
        label: "Supply bins",
        included: true,
      },
      {
        id: "seating",
        label: "Seating",
        included: true,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "unique-0",
        label: "Lighting",
        included: false,
      },
      {
        id: "unique-1",
        label: "Lighting",
        included: false,
      },
      {
        id: "unique-2",
        label: "Lighting",
        included: false,
      },
      {
        id: "unique-3",
        label: "Lighting",
        included: false,
      },
      {
        id: "unique-4",
        label: "Lighting",
        included: false,
      },
      {
        id: "unique-5",
        label: "Lighting",
        included: false,
      },
      {
        id: "unique-6",
        label: "Lighting",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "界界界界界界界界界界界界界界界界界界界界界",
        label: "Lighting",
        included: false,
      },
      {
        id: "shelves",
        label: "Storage shelves",
        included: true,
      },
      {
        id: "bins",
        label: "Supply bins",
        included: true,
      },
      {
        id: "seating",
        label: "Seating",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "界界界界界界界界界界界界界界界界界界界界界界界",
        included: false,
      },
      {
        id: "shelves",
        label: "Storage shelves",
        included: true,
      },
      {
        id: "bins",
        label: "Supply bins",
        included: true,
      },
      {
        id: "seating",
        label: "Seating",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        id: "light",
        label: "Lighting",
        included: "wrong-boolean",
      },
      {
        id: "shelves",
        label: "Storage shelves",
        included: true,
      },
      {
        id: "bins",
        label: "Supply bins",
        included: true,
      },
      {
        id: "seating",
        label: "Seating",
        included: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    broadTopic:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    topics: [
      {
        id: "item-0",
        label: "界界界界界界界界界界界界界界界界界界界界界界",
        included: true,
      },
      {
        id: "item-1",
        label: "界界界界界界界界界界界界界界界界界界界界界界",
        included: true,
      },
      {
        id: "item-2",
        label: "界界界界界界界界界界界界界界界界界界界界界界",
        included: true,
      },
      {
        id: "item-3",
        label: "界界界界界界界界界界界界界界界界界界界界界界",
        included: true,
      },
      {
        id: "item-4",
        label: "界界界界界界界界界界界界界界界界界界界界界界",
        included: false,
      },
      {
        id: "item-5",
        label: "界界界界界界界界界界界界界界界界界界界界界界",
        included: false,
      },
    ],
    focusedQuestion:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    outsideLabel:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    insideLabel: "界界界界界界界界界界界界界界界界界界界界界界界界",
  },
];
