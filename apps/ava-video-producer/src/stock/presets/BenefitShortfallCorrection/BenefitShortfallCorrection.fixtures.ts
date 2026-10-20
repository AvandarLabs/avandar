import type { Input } from "./BenefitShortfallCorrection.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  people: {
    participant: "Demo recipient",
    worker: "Demo support worker",
  },
  payments: [
    {
      id: "p1",
      label: "Demo installment",
      statedUnits: 5,
      receivedUnits: 3,
      correctionUnits: 1,
    },
  ],
  unitLabel: "Fictional credits",
  labels: {
    stated: "Statement",
    received: "Received first",
    correction: "Correction received",
    unresolved: "Still missing",
  },
  showTotals: true,
  exampleLabel: "Fictional payment example",
};
/** Minimum, dense and changed complete authored inputs. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: {
        participant: "Demo recipient",
        worker: "Demo support worker",
      },
      payments: [
        {
          id: "",
          label: "",
          statedUnits: 1,
          receivedUnits: 0,
          correctionUnits: 0,
        },
      ],
      unitLabel: "U",
      labels: {
        stated: "Statement",
        received: "Received first",
        correction: "Correction received",
        unresolved: "Still missing",
      },
      showTotals: false,
      exampleLabel: "E",
    },
  },
  {
    id: "dense",
    input: {
      people: {
        participant: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        worker: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      payments: [
        {
          id: "wide",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          statedUnits: 8,
          receivedUnits: 2,
          correctionUnits: 3,
        },
        {
          id: "other",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          statedUnits: 4,
          receivedUnits: 1,
          correctionUnits: 2,
        },
      ],
      unitLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      labels: {
        stated: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        received: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        correction: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        unresolved: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showTotals: true,
      exampleLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "changed",
    input: {
      people: {
        participant: "Demo recipient",
        worker: "Demo support worker",
      },
      payments: [
        {
          id: "p1",
          label: "Demo installment",
          statedUnits: 5,
          receivedUnits: 3,
          correctionUnits: 2,
        },
      ],
      unitLabel: "Fictional credits",
      labels: {
        stated: "Statement",
        received: "Received first",
        correction: "Correction received",
        unresolved: "Still missing",
      },
      showTotals: false,
      exampleLabel: "Fictional payment example",
    },
  },
];
/** Strict and semantic rejection cases. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    people: {
      participant: "Demo recipient",
      worker: "Demo support worker",
    },
    payments: [
      {
        id: "p1",
        label: "Demo installment",
        statedUnits: 5,
        receivedUnits: 3,
        correctionUnits: 1,
      },
    ],
    unitLabel: "Fictional credits",
    labels: {
      stated: "Statement",
      received: "Received first",
      correction: "Correction received",
      unresolved: "Still missing",
    },
    showTotals: true,
    exampleLabel: "Fictional payment example",
    extra: true,
  },
  {
    people: {
      participant: "Demo recipient",
      worker: "Demo support worker",
    },
    payments: [
      {
        id: "p1",
        label: "Demo installment",
        statedUnits: 5,
        receivedUnits: 3,
        correctionUnits: 3,
      },
    ],
    unitLabel: "Fictional credits",
    labels: {
      stated: "Statement",
      received: "Received first",
      correction: "Correction received",
      unresolved: "Still missing",
    },
    showTotals: true,
    exampleLabel: "Fictional payment example",
  },
  {
    people: {
      participant: "Demo recipient",
      worker: "Demo support worker",
    },
    payments: [
      {
        id: "p1",
        label: "Demo installment",
        statedUnits: 5,
        receivedUnits: 5,
        correctionUnits: 0,
      },
    ],
    unitLabel: "Fictional credits",
    labels: {
      stated: "Statement",
      received: "Received first",
      correction: "Correction received",
      unresolved: "Still missing",
    },
    showTotals: true,
    exampleLabel: "Fictional payment example",
  },
  {
    people: {
      participant: "Demo recipient",
      worker: "Demo support worker",
    },
    payments: [
      {
        id: "a",
        label: "",
        statedUnits: 8,
        receivedUnits: 0,
        correctionUnits: 0,
      },
      {
        id: "b",
        label: "",
        statedUnits: 8,
        receivedUnits: 0,
        correctionUnits: 0,
      },
    ],
    unitLabel: "Fictional credits",
    labels: {
      stated: "Statement",
      received: "Received first",
      correction: "Correction received",
      unresolved: "Still missing",
    },
    showTotals: true,
    exampleLabel: "Fictional payment example",
  },
];
