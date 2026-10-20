import { DEFAULT_INPUT } from "./defaultInput";
import type { Input } from "./SharedWorkshopBooking.schema";
export { DEFAULT_INPUT as defaultInput } from "./defaultInput";
export { invalidInputs } from "./invalidInputs";
/** Accepted minimum, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      timeSlots: [
        {
          id: "",
          label: "",
        },
        {
          id: "時間",
          label: "",
        },
      ],
      requests: [
        {
          ...DEFAULT_INPUT.requests[0],
          id: "",
          participant: "",
          requestedSlotId: "",
          agreedSlotId: "",
        },
        {
          ...DEFAULT_INPUT.requests[1],
          id: " 人",
          participant: "",
          requestedSlotId: "",
          agreedSlotId: null,
        },
      ],
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      machine: {
        ...DEFAULT_INPUT.machine,
        label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      timeSlots: [
        {
          id: "0",
          label: "界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "1",
          label: "界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "2",
          label: "界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "3",
          label: "界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "4",
          label: "界界界界界界界界界界界界界界界界界界",
        },
      ],
      requests: [
        {
          id: "0",
          participant: "界界界界界界界界界界界界界界界界界界界界界界界界",
          requestedSlotId: "0",
          agreedSlotId: "4",
        },
        {
          id: "1",
          participant: "界界界界界界界界界界界界界界界界界界界界界界界界",
          requestedSlotId: "0",
          agreedSlotId: "3",
        },
        {
          id: "2",
          participant: "界界界界界界界界界界界界界界界界界界界界界界界界",
          requestedSlotId: "0",
          agreedSlotId: "2",
        },
      ],
      labels: {
        ...DEFAULT_INPUT.labels,
        requested:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        agreed: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        unresolved:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        example: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      machine: { ...DEFAULT_INPUT.machine, kind: "workbench" },
      requests: [
        DEFAULT_INPUT.requests[0],
        { ...DEFAULT_INPUT.requests[1], agreedSlotId: null },
      ],
      showOriginalRequests: false,
      showUsageTurns: false,
    },
  },
  {
    id: "all-unresolved",
    input: {
      ...DEFAULT_INPUT,
      requests: [
        { ...DEFAULT_INPUT.requests[0], agreedSlotId: null },
        { ...DEFAULT_INPUT.requests[1], agreedSlotId: null },
      ],
    },
  },
];
