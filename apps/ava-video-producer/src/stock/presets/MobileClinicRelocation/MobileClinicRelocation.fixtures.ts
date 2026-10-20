import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./MobileClinicRelocation.schema";
/** Complete fictional authored defaults. */
export const DEFAULT_INPUT: Input = {
  sites: [
    {
      id: "depot",
      label: "Starting site",
      x: 0.18,
      y: 0.35,
    },
    {
      id: "community",
      label: "Community site",
      x: 0.74,
      y: 0.62,
    },
  ],
  slots: [
    {
      id: "s1",
      label: "Slot A",
    },
    {
      id: "s2",
      label: "Slot B",
    },
    {
      id: "s3",
      label: "Slot C",
    },
    {
      id: "s4",
      label: "Slot D",
    },
  ],
  people: [
    {
      id: "a",
      label: "Person A",
      slotId: "s1",
    },
    {
      id: "b",
      label: "Person B",
      slotId: "s2",
    },
    {
      id: "c",
      label: "Person C",
      slotId: "s3",
    },
    {
      id: "d",
      label: "Person D",
      slotId: null,
    },
    {
      id: "e",
      label: "Person E",
      slotId: null,
    },
  ],
  sceneLabel: "Fictional example",
  showSlotLedger: true,
  view: "local-map",
  copy: {
    map: "Schematic service area",
    people: "People in example",
    booked: "People booked",
    unbooked: "People unbooked",
    slots: "Appointment slots",
    open: "Open slots",
    clinic: "Mobile clinic",
  },
};

const minimumInput: Input = {
  ...DEFAULT_INPUT,
  sites: [
    { id: "", label: "", x: 0.15, y: 0.15 },
    { id: "site 空", label: "", x: 0.85, y: 0.85 },
  ],
  slots: [{ id: "", label: "" }],
  people: [{ id: "", label: "", slotId: "" }],
};
const denseInput: Input = {
  ...DEFAULT_INPUT,
  sites: [
    { id: "site A", label: "W".repeat(22), x: 0.15, y: 0.85 },
    { id: "site B", label: "W".repeat(22), x: 0.85, y: 0.15 },
  ],
  slots: Array.from({ length: 6 }, (_, index) => ({
    id: `slot ${index}`,
    label: "W".repeat(14),
  })),
  people: Array.from({ length: 8 }, (_, index) => ({
    id: `person ${index}`,
    label: "W".repeat(16),
    slotId: index < 6 ? `slot ${index}` : null,
  })),
  sceneLabel: "W".repeat(40),
  copy: {
    map: "W".repeat(42),
    people: "W".repeat(42),
    booked: "W".repeat(42),
    unbooked: "W".repeat(42),
    slots: "W".repeat(42),
    open: "W".repeat(42),
    clinic: "W".repeat(42),
  },
};
/** All authored people remain present when none has a booking. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  people: DEFAULT_INPUT.people.map((person) => ({ ...person, slotId: null })),
};
const toggledInput: Input = {
  ...denseInput,
  view: "globe-to-local",
  showSlotLedger: false,
};
/** Accepted boundary sites stress complete labels beside an open clinic. */
export const boundaryLabelInputs: Input[] = [false, true].map((isReversed) => ({
  ...DEFAULT_INPUT,
  sites: [
    { id: "upper-left", label: "界".repeat(22), x: 0.15, y: 0.15 },
    { id: "lower-right", label: "地".repeat(22), x: 0.85, y: 0.85 },
  ].map((_, index, sites) => sites[isReversed ? 1 - index : index]),
}));
/**
 * Dense booking rotations exercise every person-to-slot mapping beside full
 * labels.
 */
export const bookingLabelInputs: Input[] = ["CJK", "ASCII"].flatMap(
  (alphabet) =>
    Array.from({ length: 8 }, (_, rotation) => ({
      ...denseInput,
      sites: boundaryLabelInputs[rotation % 2].sites.map((site, index) => ({
        ...site,
        label: (alphabet === "CJK" ? ["界", "地"] : ["M", "W"])[index].repeat(
          22,
        ),
      })),
      people: denseInput.people.map((person, index) => {
        const slotIndex = (index + rotation) % 8;
        return {
          ...person,
          slotId: slotIndex < 6 ? denseInput.slots[slotIndex].id : null,
        };
      }),
    })),
);
/**
 * Missing or double-assigned slots and invalid site separation are rejected.
 */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, slots: [] },
  { ...DEFAULT_INPUT, people: [{ id: "x", label: "P", slotId: "missing" }] },
  {
    ...DEFAULT_INPUT,
    people: DEFAULT_INPUT.people.map((person) => ({ ...person, slotId: "s1" })),
  },
  { ...DEFAULT_INPUT, sites: [DEFAULT_INPUT.sites[0], DEFAULT_INPUT.sites[0]] },
  {
    ...DEFAULT_INPUT,
    sites: [
      DEFAULT_INPUT.sites[0],
      { ...DEFAULT_INPUT.sites[1], x: 0.2, y: 0.4 },
    ],
  },
  { ...DEFAULT_INPUT, people: [{ ...DEFAULT_INPUT.people[0], extra: true }] },
  { ...DEFAULT_INPUT, view: "global-map" },
];
/** Default, minimum, dense, changed and toggled complete examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "toggled", input: toggledInput },
  ...boundaryLabelInputs.map((input, index) => ({
    id: `boundary-label-${index}`,
    input,
  })),
];
