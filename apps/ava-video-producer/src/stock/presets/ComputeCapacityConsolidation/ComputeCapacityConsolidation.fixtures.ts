import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ComputeCapacityConsolidation.schema";
/** Complete fictional default content. */
export const DEFAULT_INPUT: Input = {
  hosts: [
    {
      id: "a",
      label: "Host A",
      capacityCpuHours: 4,
    },
    {
      id: "b",
      label: "Host B",
      capacityCpuHours: 4,
    },
    {
      id: "c",
      label: "Host C",
      capacityCpuHours: 4,
    },
  ],
  jobs: [
    {
      id: "one",
      label: "Batch A",
      cpuHours: 2,
      initialHostId: "a",
      finalHostId: "a",
    },
    {
      id: "two",
      label: "Batch B",
      cpuHours: 2,
      initialHostId: "b",
      finalHostId: "b",
    },
    {
      id: "three",
      label: "Batch C",
      cpuHours: 2,
      initialHostId: "c",
      finalHostId: "a",
    },
  ],
  windowLabel: "Same 2-hour work window",
  decision: {
    actorLabel: "Platform operator",
    actionLabel: "Apply approved placement",
  },
  emptyHostState: "sleep",
  showCapacityGuides: true,
  copy: {
    before: "Initial placement",
    after: "Approved placement",
    work: "Work conserved",
    occupied: "Occupied hosts",
    sleep: "Sleep",
    available: "Available",
    unit: "CPU-hours",
    disclaimer: "Fictional resource allocation",
  },
};
/** A genuinely changed authored scenario. */
export const CHANGED_INPUT: Input = {
  hosts: [
    {
      id: "a",
      label: "Host A",
      capacityCpuHours: 4,
    },
    {
      id: "b",
      label: "Host B",
      capacityCpuHours: 4,
    },
    {
      id: "c",
      label: "Host C",
      capacityCpuHours: 4,
    },
  ],
  jobs: [
    {
      id: "one",
      label: "Batch A",
      cpuHours: 2,
      initialHostId: "a",
      finalHostId: "a",
    },
    {
      id: "two",
      label: "Batch B",
      cpuHours: 2,
      initialHostId: "b",
      finalHostId: "b",
    },
    {
      id: "three",
      label: "Batch C",
      cpuHours: 2,
      initialHostId: "c",
      finalHostId: "b",
    },
  ],
  windowLabel: "Same 2-hour work window",
  decision: {
    actorLabel: "Platform operator",
    actionLabel: "Apply approved placement",
  },
  emptyHostState: "available",
  showCapacityGuides: true,
  copy: {
    before: "Initial placement",
    after: "Approved placement",
    work: "Work conserved",
    occupied: "Occupied hosts",
    sleep: "Sleep",
    available: "Available",
    unit: "CPU-hours",
    disclaimer: "Fictional resource allocation",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  hosts: [
    { id: "", label: "", capacityCpuHours: 0.5 },
    { id: "空 host", label: "", capacityCpuHours: 0.25 },
  ],
  jobs: [
    {
      id: "",
      label: "",
      cpuHours: 0.125,
      initialHostId: "",
      finalHostId: "空 host",
    },
    {
      id: "二",
      label: "",
      cpuHours: 0.125,
      initialHostId: "空 host",
      finalHostId: "",
    },
  ],
};
const dense: Input = {
  ...DEFAULT_INPUT,
  copy: {
    before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    work: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    occupied: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    sleep: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    available: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWWWWWWWW",
    disclaimer: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  decision: {
    ...DEFAULT_INPUT.decision,
    actorLabel: "W".repeat(32),
    actionLabel: "W".repeat(32),
  },
  windowLabel: "W".repeat(36),
  hosts: Array.from({ length: 4 }, (_, index) => ({
    id: `host-${index}`,
    label: "W".repeat(20),
    capacityCpuHours: [8, 4, 2, 1][index],
  })),
  jobs: Array.from({ length: 8 }, (_, index) => ({
    id: `job-${index}`,
    label: "W".repeat(18),
    cpuHours: 1,
    initialHostId: `host-${index < 4 ? 0 : index < 6 ? 1 : index === 6 ? 2 : 3}`,
    finalHostId: "host-0",
  })),
};
const swap: Input = {
  ...DEFAULT_INPUT,
  hosts: DEFAULT_INPUT.hosts.slice(0, 2),
  jobs: [
    {
      ...DEFAULT_INPUT.jobs[0],
      cpuHours: 4,
      initialHostId: "a",
      finalHostId: "b",
    },
    {
      ...DEFAULT_INPUT.jobs[1],
      cpuHours: 4,
      initialHostId: "b",
      finalHostId: "a",
    },
  ],
};
const unchanged: Input = {
  ...dense,
  jobs: dense.jobs.map((job) => ({ ...job, finalHostId: job.initialHostId })),
  showCapacityGuides: false,
};
const extraFixtures: StockContract<typeof swap>["fixtures"] = [
  { id: "swap-full-hosts", input: swap },
  { id: "unchanged-all-occupied", input: unchanged },
  {
    id: "available-several-empty",
    input: { ...dense, emptyHostState: "available" as const },
  },
];
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    jobs: [
      { ...DEFAULT_INPUT.jobs[0], finalHostId: "missing" },
      ...DEFAULT_INPUT.jobs.slice(1),
    ],
  },
  { ...DEFAULT_INPUT, hosts: [DEFAULT_INPUT.hosts[0], DEFAULT_INPUT.hosts[0]] },
  {
    ...DEFAULT_INPUT,
    jobs: [
      { ...DEFAULT_INPUT.jobs[0], cpuHours: 65 },
      ...DEFAULT_INPUT.jobs.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    jobs: DEFAULT_INPUT.jobs.map((job) => ({
      ...job,
      cpuHours: 4,
      finalHostId: "a",
    })),
  },
];

/** Default, minimum, dense, changed and concentrated/alternate fixtures. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: CHANGED_INPUT },
  ...extraFixtures,
];
