import { omit } from "@avandar/utils";
import { DEFAULT_INPUT } from "./defaultInput";
/** Rejected structural, boundary and cross-field inputs. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  omit(DEFAULT_INPUT, "structure"),
  omit(DEFAULT_INPUT, "specification"),
  {
    ...DEFAULT_INPUT,
    specification: { ...DEFAULT_INPUT.specification, extra: true },
  },
  omit(DEFAULT_INPUT, "observation"),
  {
    ...DEFAULT_INPUT,
    observation: { ...DEFAULT_INPUT.observation, extra: true },
  },
  omit(DEFAULT_INPUT, "observers"),
  {
    ...DEFAULT_INPUT,
    observers: [
      {
        id: "a",
        label: "Demo resident A",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    observers: [
      {
        id: "a",
        label: "Demo resident A",
      },
      {
        id: "a",
        label: "Demo resident A",
      },
      {
        id: "a",
        label: "Demo resident A",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    observers: [
      { ...DEFAULT_INPUT.observers[0], extra: true },
      DEFAULT_INPUT.observers[1],
    ],
  },
  omit(DEFAULT_INPUT, "showDifference"),
  omit(DEFAULT_INPUT, "labels"),
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, structure: "invalid" },
  {
    ...DEFAULT_INPUT,
    specification: {
      ...DEFAULT_INPUT.specification,
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    specification: { ...DEFAULT_INPUT.specification, length: 0.99 },
  },
  {
    ...DEFAULT_INPUT,
    specification: { ...DEFAULT_INPUT.specification, length: 9 },
  },
  {
    ...DEFAULT_INPUT,
    specification: {
      ...DEFAULT_INPUT.specification,
      unit: "WWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    observation: {
      ...DEFAULT_INPUT.observation,
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    observation: { ...DEFAULT_INPUT.observation, length: 0.99 },
  },
  {
    ...DEFAULT_INPUT,
    observation: { ...DEFAULT_INPUT.observation, length: 9 },
  },
  {
    ...DEFAULT_INPUT,
    observation: {
      ...DEFAULT_INPUT.observation,
      sourceLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    observers: [
      { ...DEFAULT_INPUT.observers[0], id: "WWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.observers[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    observers: [
      { ...DEFAULT_INPUT.observers[0], label: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.observers[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      specification: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      observation: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      difference: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    observers: [
      DEFAULT_INPUT.observers[0],
      { ...DEFAULT_INPUT.observers[1], id: "a" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    observation: { ...DEFAULT_INPUT.observation, length: Infinity },
  },
  {
    ...DEFAULT_INPUT,
    observation: { ...DEFAULT_INPUT.observation, length: -Infinity },
  },
  {
    ...DEFAULT_INPUT,
    observation: { ...DEFAULT_INPUT.observation, length: NaN },
  },
];
