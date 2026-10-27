import type { Input } from "./StormwaterStorageSpill.schema";
/** Accepted inputs that expose transfer overlap and destination ownership. */
export const REVIEW_FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "all-overflow-left",
    input: {
      event: {
        incomingM3: 10000,
        infiltratedM3: 0,
        dischargedM3: 0,
      },
      detentionCapacityM3: 0,
      boundary: {
        locationLabel: "Schematic demonstration block",
        periodLabel: "One fictional storm event",
      },
      decision: {
        actorLabel: "Drainage operator",
        actionLabel: "Set event outlet plan",
      },
      overflowSide: "left",
      showBalance: false,
      copy: {
        inflow: "Event inflow",
        infiltration: "Infiltrated",
        discharge: "Controlled discharge",
        detained: "Detained at event end",
        overflow: "Overflow",
        capacity: "Storage capacity",
        unit: "m3",
        disclaimer: "Fictional volumes; not a flood forecast",
      },
    },
  },
  {
    id: "all-overflow-right",
    input: {
      event: {
        incomingM3: 10000,
        infiltratedM3: 0,
        dischargedM3: 0,
      },
      detentionCapacityM3: 0,
      boundary: {
        locationLabel: "Schematic demonstration block",
        periodLabel: "One fictional storm event",
      },
      decision: {
        actorLabel: "Drainage operator",
        actionLabel: "Set event outlet plan",
      },
      overflowSide: "right",
      showBalance: false,
      copy: {
        inflow: "Event inflow",
        infiltration: "Infiltrated",
        discharge: "Controlled discharge",
        detained: "Detained at event end",
        overflow: "Overflow",
        capacity: "Storage capacity",
        unit: "m3",
        disclaimer: "Fictional volumes; not a flood forecast",
      },
    },
  },
  {
    id: "no-stored-or-overflow",
    input: {
      event: {
        incomingM3: 10,
        infiltratedM3: 4,
        dischargedM3: 6,
      },
      detentionCapacityM3: 10,
      boundary: {
        locationLabel: "Schematic demonstration block",
        periodLabel: "One fictional storm event",
      },
      decision: {
        actorLabel: "Drainage operator",
        actionLabel: "Set event outlet plan",
      },
      overflowSide: "right",
      showBalance: true,
      copy: {
        inflow: "Event inflow",
        infiltration: "Infiltrated",
        discharge: "Controlled discharge",
        detained: "Detained at event end",
        overflow: "Overflow",
        capacity: "Storage capacity",
        unit: "m3",
        disclaimer: "Fictional volumes; not a flood forecast",
      },
    },
  },
];
