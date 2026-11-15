import type { Input } from "./PrivateCaseConversation.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  people: [
    {
      id: "p",
      label: "Demo participant",
      role: "participant",
    },
    {
      id: "w",
      label: "Demo worker",
      role: "worker",
    },
    {
      id: "s",
      label: "Chosen supporter",
      role: "supporter",
    },
  ],
  requestLabel: "I'd like to speak privately",
  roomLabels: {
    meeting: "Private conversation",
    waiting: "Supporter waiting",
  },
  partition: "screen",
  showWaitingSupporter: true,
  copy: {
    acknowledgement: "Of course",
    hold: "Participant and worker continue",
    example: "Fictional meeting example",
  },
};
/** Minimum, dense and changed complete authored inputs. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: [
        {
          id: "",
          label: "",
          role: "participant",
        },
        {
          id: "w",
          label: "Demo worker",
          role: "worker",
        },
        {
          id: "s",
          label: "Chosen supporter",
          role: "supporter",
        },
      ],
      requestLabel: "P",
      roomLabels: {
        meeting: "Private conversation",
        waiting: "Supporter waiting",
      },
      partition: "door",
      showWaitingSupporter: false,
      copy: {
        acknowledgement: "Of course",
        hold: "Participant and worker continue",
        example: "Fictional meeting example",
      },
    },
  },
  {
    id: "dense",
    input: {
      people: [
        {
          id: "p",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          role: "participant",
        },
        {
          id: "w",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          role: "worker",
        },
        {
          id: "s",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          role: "supporter",
        },
      ],
      requestLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      roomLabels: {
        meeting: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        waiting: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      partition: "screen",
      showWaitingSupporter: true,
      copy: {
        acknowledgement: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        hold: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      people: [
        {
          id: "",
          label: "",
          role: "participant",
        },
        {
          id: "w",
          label: "Demo worker",
          role: "worker",
        },
        {
          id: "s",
          label: "Chosen supporter",
          role: "supporter",
        },
      ],
      requestLabel: "A private moment please",
      roomLabels: {
        meeting: "Private conversation",
        waiting: "Supporter waiting",
      },
      partition: "door",
      showWaitingSupporter: false,
      copy: {
        acknowledgement: "Of course",
        hold: "Participant and worker continue",
        example: "Fictional meeting example",
      },
    },
  },
];
/** Strict and semantic rejection cases. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    people: [
      {
        id: "p",
        label: "Demo participant",
        role: "participant",
      },
      {
        id: "w",
        label: "Demo worker",
        role: "worker",
      },
      {
        id: "s",
        label: "Chosen supporter",
        role: "supporter",
      },
    ],
    requestLabel: "I'd like to speak privately",
    roomLabels: {
      meeting: "Private conversation",
      waiting: "Supporter waiting",
    },
    partition: "screen",
    showWaitingSupporter: true,
    copy: {
      acknowledgement: "Of course",
      hold: "Participant and worker continue",
      example: "Fictional meeting example",
    },
    extra: true,
  },
  {
    people: [
      {
        id: "p",
        label: "Demo participant",
        role: "participant",
      },
      {
        id: "p",
        label: "Demo participant",
        role: "participant",
      },
      {
        id: "p",
        label: "Demo participant",
        role: "participant",
      },
    ],
    requestLabel: "I'd like to speak privately",
    roomLabels: {
      meeting: "Private conversation",
      waiting: "Supporter waiting",
    },
    partition: "screen",
    showWaitingSupporter: true,
    copy: {
      acknowledgement: "Of course",
      hold: "Participant and worker continue",
      example: "Fictional meeting example",
    },
  },
  {
    people: [
      {
        id: "p",
        label: "Demo participant",
        role: "participant",
      },
      {
        id: "w",
        label: "Demo worker",
        role: "worker",
      },
    ],
    requestLabel: "I'd like to speak privately",
    roomLabels: {
      meeting: "Private conversation",
      waiting: "Supporter waiting",
    },
    partition: "screen",
    showWaitingSupporter: true,
    copy: {
      acknowledgement: "Of course",
      hold: "Participant and worker continue",
      example: "Fictional meeting example",
    },
  },
];
