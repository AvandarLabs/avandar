import type { Input } from "./RetryBackoff.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  attempts: [
    {
      label: "Attempt 1",
      outcome: "retry",
      delayAfter: 1,
    },
    {
      label: "Attempt 2",
      outcome: "retry",
      delayAfter: 2,
    },
    {
      label: "Attempt 3",
      outcome: "complete",
      delayAfter: 0,
    },
  ],
  operationLabel: "Fetch sample",
  outcomeLabels: {
    retry: "Try again",
    complete: "Received",
    stop: "Stop here",
    wait: "Wait",
  },
  delayUnit: "s",
  showDelayValues: true,
  showAttemptLabels: true,
};
/** Accepted minimum, crowded, changed, and toggle cases. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      attempts: [
        {
          label: "Attempt 1",
          outcome: "retry",
          delayAfter: 1,
        },
        {
          label: "Attempt 2",
          outcome: "retry",
          delayAfter: 2,
        },
        {
          label: "Attempt 3",
          outcome: "complete",
          delayAfter: 0,
        },
      ],
      operationLabel: "Fetch sample",
      outcomeLabels: {
        retry: "Try again",
        complete: "Received",
        stop: "Stop here",
        wait: "Wait",
      },
      delayUnit: "s",
      showDelayValues: true,
      showAttemptLabels: true,
    },
  },
  {
    id: "minimum",
    input: {
      attempts: [
        {
          label: "",
          outcome: "retry",
          delayAfter: 1,
        },
        {
          label: "B",
          outcome: "retry",
          delayAfter: 2,
        },
        {
          label: "C",
          outcome: "stop",
          delayAfter: 0,
        },
      ],
      operationLabel: "Fetch sample",
      outcomeLabels: {
        retry: "Try again",
        complete: "Received",
        stop: "Stop here",
        wait: "Wait",
      },
      delayUnit: "s",
      showDelayValues: true,
      showAttemptLabels: true,
    },
  },
  {
    id: "dense",
    input: {
      attempts: [
        {
          label: "WWWWWWWWWWWWWWWW",
          outcome: "retry",
          delayAfter: 1,
        },
        {
          label: "WWWWWWWWWWWWWWWW",
          outcome: "retry",
          delayAfter: 2,
        },
        {
          label: "WWWWWWWWWWWWWWWW",
          outcome: "retry",
          delayAfter: 16,
        },
        {
          label: "WWWWWWWWWWWWWWWW",
          outcome: "complete",
          delayAfter: 0,
        },
      ],
      operationLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      outcomeLabels: {
        retry: "WWWWWWWWWWWWWWWWWW",
        complete: "WWWWWWWWWWWWWWWWWW",
        stop: "WWWWWWWWWWWWWWWWWW",
        wait: "WWWWWWWWWWWWWWWWWW",
      },
      delayUnit: "WWWWWWWWWWWW",
      showDelayValues: true,
      showAttemptLabels: true,
    },
  },
  {
    id: "changed",
    input: {
      attempts: [
        {
          label: "Attempt 1",
          outcome: "retry",
          delayAfter: 1,
        },
        {
          label: "Attempt 2",
          outcome: "retry",
          delayAfter: 2,
        },
        {
          label: "Attempt 3",
          outcome: "stop",
          delayAfter: 0,
        },
      ],
      operationLabel: "Retry sample",
      outcomeLabels: {
        retry: "Try again",
        complete: "Received",
        stop: "Stop here",
        wait: "Wait",
      },
      delayUnit: "s",
      showDelayValues: false,
      showAttemptLabels: false,
    },
  },
];
