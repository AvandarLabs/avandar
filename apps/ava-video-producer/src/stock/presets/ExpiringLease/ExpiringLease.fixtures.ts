import type { Input } from "./ExpiringLease.schema";
/** Complete fictional finite editing lease. */
export const DEFAULT_INPUT: Input = {
  participants: [
    { id: "editor-a", label: "Example editor A" },
    { id: "editor-b", label: "Example editor B" },
    { id: "editor-c", label: "Example editor C" },
  ],
  holderId: "editor-a",
  permissionLabel: "Example editing lease",
  lifetime: { value: 4, unit: "example turns" },
  copy: {
    dock: "Example permission pool",
    held: "Temporarily held",
    expired: "Lease ended",
    unassigned: "Available, not assigned",
    example: "Fictional compressed timing",
  },
  showLifetime: true,
  showLabels: true,
};
/** Exact collection/lifetime bounds and changed holder example. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      participants: [
        { id: "", label: "A" },
        { id: "b", label: "B" },
      ],
      holderId: "",
      lifetime: { value: 1, unit: "T" },
      showLifetime: false,
      showLabels: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      participants: Array.from({ length: 4 }, (_, index) => ({
        id: `person ${index}`,
        label: "W".repeat(24),
      })),
      holderId: "person 3",
      permissionLabel: "W".repeat(30),
      lifetime: { value: 8, unit: "W".repeat(20) },
      copy: {
        dock: "W".repeat(32),
        held: "W".repeat(32),
        expired: "W".repeat(32),
        unassigned: "W".repeat(32),
        example: "W".repeat(32),
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      holderId: "editor-c",
      lifetime: { value: 2, unit: "example reviews" },
      permissionLabel: "Example review permission",
    },
  },
];
