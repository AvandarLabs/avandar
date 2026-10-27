import type { Input } from "./ScheduleBuffer.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  tasks: [
    {
      id: "draft",
      label: "Draft",
      duration: 2,
    },
    {
      id: "review",
      label: "Review",
      duration: 1,
    },
    {
      id: "send",
      label: "Send",
      duration: 1,
    },
  ],
  reserveUnits: 2,
  interruption: {
    label: "Extra pass",
    afterTaskId: "draft",
    duration: 1,
  },
  scheduleLabels: {
    reserve: "Reserve",
    deadline: "Delivery",
  },
  unitLabel: "slots",
  showValues: true,
  resultLabel: "Reserve absorbs the delay",
};
/** Accepted minimum, crowded, changed, and toggle cases. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      tasks: [
        {
          id: "draft",
          label: "Draft",
          duration: 2,
        },
        {
          id: "review",
          label: "Review",
          duration: 1,
        },
        {
          id: "send",
          label: "Send",
          duration: 1,
        },
      ],
      reserveUnits: 2,
      interruption: {
        label: "Extra pass",
        afterTaskId: "draft",
        duration: 1,
      },
      scheduleLabels: {
        reserve: "Reserve",
        deadline: "Delivery",
      },
      unitLabel: "slots",
      showValues: true,
      resultLabel: "Reserve absorbs the delay",
    },
  },
  {
    id: "minimum",
    input: {
      tasks: [
        {
          id: "",
          label: "A",
          duration: 1,
        },
        {
          id: "空 間",
          label: "B",
          duration: 1,
        },
      ],
      reserveUnits: 1,
      interruption: {
        label: "D",
        afterTaskId: "",
        duration: 1,
      },
      scheduleLabels: {
        reserve: "Reserve",
        deadline: "Delivery",
      },
      unitLabel: "slots",
      showValues: true,
      resultLabel: "Reserve absorbs the delay",
    },
  },
  {
    id: "dense",
    input: {
      tasks: [
        {
          id: "t 0",
          label: "WWWWWWWWWWWWWWWW",
          duration: 1,
        },
        {
          id: "t 1",
          label: "WWWWWWWWWWWWWWWW",
          duration: 4,
        },
        {
          id: "t 2",
          label: "WWWWWWWWWWWWWWWW",
          duration: 1,
        },
        {
          id: "t 3",
          label: "WWWWWWWWWWWWWWWW",
          duration: 4,
        },
      ],
      reserveUnits: 4,
      interruption: {
        label: "WWWWWWWWWWWWWWWWWW",
        afterTaskId: "t 0",
        duration: 1,
      },
      scheduleLabels: {
        reserve: "WWWWWWWWWWWWWWWWWWWW",
        deadline: "WWWWWWWWWWWWWWWWWWWW",
      },
      unitLabel: "WWWWWWWWWWWW",
      showValues: true,
      resultLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "changed",
    input: {
      tasks: [
        {
          id: "draft",
          label: "Draft",
          duration: 2,
        },
        {
          id: "review",
          label: "Review",
          duration: 1,
        },
        {
          id: "send",
          label: "Send",
          duration: 1,
        },
      ],
      reserveUnits: 2,
      interruption: {
        label: "Extra pass",
        afterTaskId: "review",
        duration: 2,
      },
      scheduleLabels: {
        reserve: "Reserve",
        deadline: "Delivery",
      },
      unitLabel: "slots",
      showValues: false,
      resultLabel: "Reserve absorbs the delay",
    },
  },
];
