import type { Input } from "./SharedWorkshopBooking.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  machine: {
    kind: "sewing-machine",
    label: "Demo shared machine",
  },
  timeSlots: [
    {
      id: "a",
      label: "Demo slot A",
    },
    {
      id: "b",
      label: "Demo slot B",
    },
    {
      id: "c",
      label: "Demo slot C",
    },
  ],
  requests: [
    {
      id: "a",
      participant: "Demo maker A",
      requestedSlotId: "a",
      agreedSlotId: "a",
    },
    {
      id: "b",
      participant: "Demo maker B",
      requestedSlotId: "a",
      agreedSlotId: "b",
    },
  ],
  labels: {
    requested: "Requested time",
    agreed: "Agreed time",
    unresolved: "Still to agree",
    example: "Fictional workshop example",
  },
  showOriginalRequests: true,
  showUsageTurns: true,
};
