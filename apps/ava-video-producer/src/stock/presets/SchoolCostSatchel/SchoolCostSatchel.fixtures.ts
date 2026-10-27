import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SchoolCostSatchel.schema";
/** Fictional complete examples and deliberately invalid author inputs. */
export const DEFAULT_INPUT: Input = {
  expenses: [
    {
      id: "book",
      label: "Workbook",
      object: "book",
      amount: 3,
    },
    {
      id: "fare",
      label: "Transport",
      object: "ticket",
      amount: 2,
    },
    {
      id: "clothing",
      label: "School clothing",
      object: "clothing",
      amount: 1,
    },
  ],
  periodLabel: "One fictional term",
  unitLabel: "example credits",
  sceneLabels: {
    learner: "Learner A",
    school: "Example school",
    total: "Listed cost",
  },
  showExpenseShares: true,
  unpackOrder: "input-order",
  caption: "Fictional costs, not an affordability test",
};
/** Changed zero/tie case preserves authored period-normalized costs. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  expenses: [
    { id: "zero", label: "Donated book", object: "book", amount: 0 },
    { id: "meal", label: "Meals this term", object: "meal", amount: 4 },
    { id: "fare", label: "Fare this term", object: "ticket", amount: 4 },
  ],
  unpackOrder: "largest-first",
};
/** Schema rejection examples. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, expenses: [] },
  {
    ...DEFAULT_INPUT,
    expenses: DEFAULT_INPUT.expenses.map((e) => ({ ...e, amount: 0 })),
  },
  {
    ...DEFAULT_INPUT,
    expenses: [DEFAULT_INPUT.expenses[0], DEFAULT_INPUT.expenses[0]],
  },
  {
    ...DEFAULT_INPUT,
    expenses: [
      { ...DEFAULT_INPUT.expenses[0], amount: 21 },
      DEFAULT_INPUT.expenses[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    expenses: [
      { ...DEFAULT_INPUT.expenses[0], amount: 1.5 },
      DEFAULT_INPUT.expenses[1],
    ],
  },
];
/** Minimum collection with zero cost alongside a positive authored total. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  expenses: [
    { id: "本", label: "B", object: "book", amount: 0 },
    { id: "fare space", label: "F", object: "ticket", amount: 1 },
  ],
  showExpenseShares: false,
};
/** All five physical object kinds and maximum accepted caption lengths. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  expenses: (["book", "ticket", "clothing", "meal", "fee-slip"] as const).map(
    (object, index) => ({
      id: `cost ${index}`,
      label: "界".repeat(22),
      object,
      amount: 20,
    }),
  ),
  periodLabel: "界".repeat(32),
  unitLabel: "界".repeat(18),
  sceneLabels: {
    learner: "界".repeat(24),
    school: "界".repeat(24),
    total: "界".repeat(24),
  },
  caption: "界".repeat(56),
};
/** Distinct authored costs may share identical presentation fields. */
export const equalTupleInput: Input = {
  ...DEFAULT_INPUT,
  expenses: [
    { id: "first", label: "Meal", object: "meal", amount: 2 },
    { id: "second", label: "Meal", object: "meal", amount: 2 },
  ],
  unpackOrder: "largest-first",
};
/** Default, minimum, dense and alternate complete inputs. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "equal-tuples", input: equalTupleInput },
];
