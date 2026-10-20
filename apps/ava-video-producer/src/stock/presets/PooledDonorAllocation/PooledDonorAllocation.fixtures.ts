import type { Input } from "./PooledDonorAllocation.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  requests: [
    {
      id: "food",
      label: "Example food transport",
    },
    {
      id: "shelter",
      label: "Example shelter access",
    },
  ],
  contributions: [
    {
      id: "a",
      donorLabel: "Example donor A",
      mark: "A",
      credits: 4,
      earmarkedRequestId: "food",
    },
    {
      id: "b",
      donorLabel: "Example donor B",
      mark: "B",
      credits: 3,
      earmarkedRequestId: null,
    },
    {
      id: "c",
      donorLabel: "Example donor C",
      mark: "C",
      credits: 3,
      earmarkedRequestId: "shelter",
    },
  ],
  allocations: [
    {
      contributionId: "a",
      requestId: "food",
      credits: 4,
    },
    {
      contributionId: "b",
      requestId: "food",
      credits: 1,
    },
    {
      contributionId: "b",
      requestId: "shelter",
      credits: 1,
    },
    {
      contributionId: "c",
      requestId: "shelter",
      credits: 3,
    },
  ],
  labels: {
    coordinator: "Community coordinator",
    pool: "Shared pool",
    earmarked: "Earmarked",
    flexible: "Flexible",
    allocated: "Allocated to request",
    remaining: "Still in pool",
    unit: "Demo credits",
  },
  showAllocationTotals: true,
  envelopeArrangement: "fan",
  scenarioCaption: "Fictional funds and allocations",
};
/** Changed author input used by the behavioral test. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  envelopeArrangement: "side-by-side",
  showAllocationTotals: false,
};
/** Rejected incomplete, unknown and invalid authored inputs. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, unexpected: true },
  {},
  {
    ...DEFAULT_INPUT,
    allocations: [{ contributionId: "missing", requestId: "food", credits: 1 }],
  },
];

/** Smallest accepted collection example, including literal empty IDs. */
export const MINIMUM_INPUT: Input = {
  requests: [
    { id: "", label: "" },
    { id: "路 2", label: "" },
  ],
  contributions: [
    { id: "", donorLabel: "", mark: " ", credits: 1, earmarkedRequestId: "" },
    {
      id: "路 2",
      donorLabel: "",
      mark: "·",
      credits: 1,
      earmarkedRequestId: null,
    },
  ],
  allocations: [
    { contributionId: "", requestId: "", credits: 1 },
    { contributionId: "路 2", requestId: "路 2", credits: 1 },
  ],
  labels: {
    coordinator: "Community coordinator",
    pool: "Shared pool",
    earmarked: "Earmarked",
    flexible: "Flexible",
    allocated: "Allocated to request",
    remaining: "Still in pool",
    unit: "Demo credits",
  },
  showAllocationTotals: true,
  envelopeArrangement: "fan",
  scenarioCaption: "Fictional funds and allocations",
};
/** Maximum density with full accepted display text. */
export const DENSE_INPUT: Input = {
  requests: [
    { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW" },
    { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW" },
    { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  ],
  contributions: [
    {
      id: "0",
      donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      mark: "AA",
      credits: 5,
      earmarkedRequestId: "0",
    },
    {
      id: "1",
      donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      mark: "BB",
      credits: 4,
      earmarkedRequestId: null,
    },
    {
      id: "2",
      donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      mark: "CC",
      credits: 3,
      earmarkedRequestId: null,
    },
    {
      id: "3",
      donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      mark: "DD",
      credits: 2,
      earmarkedRequestId: null,
    },
  ],
  allocations: [
    { contributionId: "0", requestId: "0", credits: 5 },
    { contributionId: "1", requestId: "0", credits: 4 },
    { contributionId: "2", requestId: "0", credits: 2 },
    { contributionId: "3", requestId: "0", credits: 1 },
    { contributionId: "2", requestId: "1", credits: 1 },
    { contributionId: "3", requestId: "2", credits: 1 },
  ],
  labels: {
    coordinator: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    pool: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    earmarked: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    flexible: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    allocated: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    remaining: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showAllocationTotals: true,
  envelopeArrangement: "fan",
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/**
 * Unequal request batches preserve the accepted fourteen-credit concentration.
 */
const smallThenLargeInput: Input = {
  ...DENSE_INPUT,
  requests: DENSE_INPUT.requests.slice(0, 2),
  contributions: DENSE_INPUT.contributions.map((contribution, index) => ({
    ...contribution,
    earmarkedRequestId: index === 3 ? "1" : null,
  })),
  allocations: [
    { contributionId: "0", requestId: "0", credits: 1 },
    { contributionId: "0", requestId: "1", credits: 4 },
    { contributionId: "1", requestId: "1", credits: 4 },
    { contributionId: "2", requestId: "1", credits: 3 },
    { contributionId: "3", requestId: "1", credits: 2 },
  ],
};

/**
 * Both request orders and envelope arrangements exercise empty-scoop resizing.
 */
export const unequalBatchFixtures: Array<{ id: string; input: Input }> = (
  ["fan", "side-by-side"] as const
).flatMap((envelopeArrangement) =>
  [false, true].map((isLargeFirst) => ({
    id: `${isLargeFirst ? "13-1" : "1-13"}-${envelopeArrangement}`,
    input: {
      ...smallThenLargeInput,
      envelopeArrangement,
      requests: isLargeFirst
        ? [...smallThenLargeInput.requests].reverse()
        : smallThenLargeInput.requests,
    },
  })),
);

/** Default, minimal, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: changedInput },
  ...unequalBatchFixtures,
  {
    id: "thirteen-to-one-envelope",
    input: {
      requests: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      contributions: [
        {
          id: "0",
          donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          mark: "AA",
          credits: 5,
          earmarkedRequestId: "0",
        },
        {
          id: "1",
          donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          mark: "BB",
          credits: 4,
          earmarkedRequestId: null,
        },
        {
          id: "2",
          donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          mark: "CC",
          credits: 3,
          earmarkedRequestId: null,
        },
        {
          id: "3",
          donorLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          mark: "DD",
          credits: 2,
          earmarkedRequestId: null,
        },
      ],
      allocations: [
        { contributionId: "0", requestId: "0", credits: 5 },
        { contributionId: "1", requestId: "0", credits: 4 },
        { contributionId: "2", requestId: "0", credits: 3 },
        { contributionId: "3", requestId: "0", credits: 1 },
        { contributionId: "3", requestId: "1", credits: 1 },
      ],
      labels: {
        coordinator: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        pool: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        earmarked: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        flexible: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        allocated: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        remaining: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        unit: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showAllocationTotals: true,
      envelopeArrangement: "side-by-side",
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
];
