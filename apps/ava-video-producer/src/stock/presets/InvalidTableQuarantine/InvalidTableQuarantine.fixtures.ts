import type { Input } from "./InvalidTableQuarantine.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  originalRows: ["A: 2", "B: 4", "C: 3"],
  attempt: {
    rowIndex: 1,
    replacement: "B: 9",
    outcome: "failed",
  },
  reload: {
    performed: true,
    rows: ["A: 2", "B: 4", "C: 3"],
  },
  labels: {
    readable: "Readable",
    invalid: "Invalid until complete reload",
    blocked: "Read blocked",
    reload: "Complete reload",
  },
  showAttempt: true,
};
/** Minimum, concentrated dense and changed authored examples. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      originalRows: ["A: 2", "B: 4", "C: 3"],
      attempt: {
        rowIndex: 1,
        replacement: "B: 9",
        outcome: "failed",
      },
      reload: {
        performed: true,
        rows: ["A: 2", "B: 4", "C: 3"],
      },
      labels: {
        readable: "Readable",
        invalid: "Invalid until complete reload",
        blocked: "Read blocked",
        reload: "Complete reload",
      },
      showAttempt: true,
    },
  },
  {
    id: "minimum",
    input: {
      originalRows: ["A", "B"],
      attempt: {
        rowIndex: 0,
        replacement: "",
        outcome: "completed",
      },
      reload: {
        performed: false,
        rows: [],
      },
      labels: {
        readable: "Readable",
        invalid: "Invalid until complete reload",
        blocked: "Read blocked",
        reload: "Complete reload",
      },
      showAttempt: false,
    },
  },
  {
    id: "dense",
    input: {
      originalRows: [
        "界界界界界界界界界界界界界界界界界界",
        "界界界界界界界界界界界界界界界界界界",
        "界界界界界界界界界界界界界界界界界界",
        "界界界界界界界界界界界界界界界界界界",
      ],
      attempt: {
        rowIndex: 3,
        replacement: "界界界界界界界界界界界界界界界界界界",
        outcome: "completed",
      },
      reload: {
        performed: true,
        rows: [
          "界界界界界界界界界界界界界界界界界界",
          "界界界界界界界界界界界界界界界界界界",
          "界界界界界界界界界界界界界界界界界界",
          "界界界界界界界界界界界界界界界界界界",
        ],
      },
      labels: {
        readable:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        invalid:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        blocked:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        reload:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      showAttempt: true,
    },
  },
  {
    id: "changed",
    input: {
      originalRows: ["A: 2", "B: 4", "C: 3"],
      attempt: {
        rowIndex: 1,
        replacement: "",
        outcome: "failed",
      },
      reload: {
        performed: true,
        rows: ["", "X: 0", " ", "Z: 8"],
      },
      labels: {
        readable: "Readable",
        invalid: "Invalid until complete reload",
        blocked: "Read blocked",
        reload: "Complete reload",
      },
      showAttempt: true,
    },
  },
];
/** Invalid structures and cross-field references. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: 1,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: ["A: 2", "B: 4", "C: 3"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
    extra: true,
  },
  {
    originalRows: ["A"],
    attempt: {
      rowIndex: 1,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: ["A: 2", "B: 4", "C: 3"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: 3,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: ["A: 2", "B: 4", "C: 3"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: -1,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: ["A: 2", "B: 4", "C: 3"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: 0.5,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: ["A: 2", "B: 4", "C: 3"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: 1,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: false,
      rows: ["A", "B"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: 1,
      replacement: "B: 9",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: [],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
  {
    originalRows: ["A: 2", "B: 4", "C: 3"],
    attempt: {
      rowIndex: 1,
      replacement: "xxxxxxxxxxxxxxxxxxx",
      outcome: "failed",
    },
    reload: {
      performed: true,
      rows: ["A: 2", "B: 4", "C: 3"],
    },
    labels: {
      readable: "Readable",
      invalid: "Invalid until complete reload",
      blocked: "Read blocked",
      reload: "Complete reload",
    },
    showAttempt: true,
  },
];
