import type { Input } from "./ReadinessLatch.schema";
/** Complete fictional readiness example. */
export const DEFAULT_INPUT: Input = {
  participants: [
    { id: "lights", label: "Example lights", ready: true, workUnits: 2 },
    { id: "sound", label: "Example sound", ready: true, workUnits: 4 },
    { id: "stage", label: "Example stage", ready: true, workUnits: 3 },
  ],
  sharedAction: "Example curtain cue",
  copy: {
    ready: "Ready",
    waiting: "Waiting",
    held: "Waiting for every pin",
    released: "All pins withdrawn",
    example: "Fictional example",
  },
  orientation: "horizontal",
  showParticipantStates: true,
  showLabels: true,
  showWorkValues: false,
  unitLabel: "work units",
};
/** Collection bounds and a blocked dependency binding. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      participants: [
        { id: "", label: "A", ready: true, workUnits: 1 },
        { id: "b", label: "B", ready: true, workUnits: 1 },
      ],
      orientation: "vertical",
      showLabels: false,
      showParticipantStates: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      participants: Array.from({ length: 5 }, (_, index) => ({
        id: `branch ${index}`,
        label: "W".repeat(24),
        ready: true,
        workUnits: index + 1,
      })),
      sharedAction: "W".repeat(32),
      copy: {
        ready: "W".repeat(30),
        waiting: "W".repeat(30),
        held: "W".repeat(30),
        released: "W".repeat(30),
        example: "W".repeat(30),
      },
      showWorkValues: true,
      unitLabel: "W".repeat(16),
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      participants: [
        {
          id: "cached",
          label: "Example cached dataset",
          ready: true,
          workUnits: 1,
        },
        {
          id: "missing",
          label: "Example pending dataset",
          ready: false,
          workUnits: 5,
        },
      ],
      sharedAction: "Example offline report",
      orientation: "vertical",
      showWorkValues: true,
    },
  },
];
