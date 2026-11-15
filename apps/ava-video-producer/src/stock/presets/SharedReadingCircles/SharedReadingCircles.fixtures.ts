import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SharedReadingCircles.schema";
/** Fictional complete examples and deliberately invalid author inputs. */
export const DEFAULT_INPUT: Input = {
  learners: [
    {
      id: "a",
      label: "Learner A",
    },
    {
      id: "b",
      label: "Learner B",
    },
    {
      id: "c",
      label: "Learner C",
    },
    {
      id: "d",
      label: "Learner D",
    },
    {
      id: "e",
      label: "Learner E",
    },
    {
      id: "f",
      label: "Learner F",
    },
  ],
  books: [
    {
      id: "book-a",
      label: "Story book A",
      pageLabel: "Example passage A",
    },
    {
      id: "book-b",
      label: "Story book B",
      pageLabel: "Example passage B",
    },
  ],
  readingGroups: [
    {
      bookId: "book-a",
      learnerIds: ["a", "b", "c"],
    },
    {
      bookId: "book-b",
      learnerIds: ["d", "e", "f"],
    },
  ],
  startingShelf: "front",
  labels: {
    books: "Book copies",
    readers: "Readers at this book",
    class: "Learners in class",
  },
  showGroupCounts: true,
  caption: "Fictional reading arrangement",
};
/** One physical copy serves four readers. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  books: [DEFAULT_INPUT.books[0]],
  learners: DEFAULT_INPUT.learners.slice(0, 4),
  readingGroups: [{ bookId: "book-a", learnerIds: ["a", "b", "c", "d"] }],
  startingShelf: "side",
  showGroupCounts: false,
};
/** Schema rejection examples. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, books: [] },
  {
    ...DEFAULT_INPUT,
    readingGroups: [
      { bookId: "unknown", learnerIds: ["a", "b", "c"] },
      DEFAULT_INPUT.readingGroups[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    readingGroups: [
      { bookId: "book-a", learnerIds: ["a", "b", "d"] },
      DEFAULT_INPUT.readingGroups[1],
    ],
  },
  { ...DEFAULT_INPUT, readingGroups: [DEFAULT_INPUT.readingGroups[0]] },
  {
    ...DEFAULT_INPUT,
    readingGroups: [
      { bookId: "book-a", learnerIds: ["a", "b", "unknown"] },
      DEFAULT_INPUT.readingGroups[1],
    ],
  },
];
/** One book shared by the smallest accepted class. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  learners: DEFAULT_INPUT.learners.slice(0, 2),
  books: [DEFAULT_INPUT.books[0]],
  readingGroups: [{ bookId: "book-a", learnerIds: ["a", "b"] }],
  showGroupCounts: false,
};
/** Four books and eight readers with deliberately unequal groups. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  learners: Array.from({ length: 8 }, (_, index) => ({
    id: `reader ${index}`,
    label: "界".repeat(16),
  })),
  books: Array.from({ length: 4 }, (_, index) => ({
    id: `book ${index}`,
    label: "界".repeat(22),
    pageLabel: "界".repeat(28),
  })),
  readingGroups: [
    {
      bookId: "book 0",
      learnerIds: ["reader 0", "reader 1", "reader 2", "reader 3"],
    },
    { bookId: "book 1", learnerIds: ["reader 4", "reader 5"] },
    { bookId: "book 2", learnerIds: ["reader 6"] },
    { bookId: "book 3", learnerIds: ["reader 7"] },
  ],
  labels: {
    books: "界".repeat(26),
    readers: "界".repeat(26),
    class: "界".repeat(26),
  },
  caption: "界".repeat(48),
};
/** Complete layouts preserve inventory with counts shown or hidden. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
];
