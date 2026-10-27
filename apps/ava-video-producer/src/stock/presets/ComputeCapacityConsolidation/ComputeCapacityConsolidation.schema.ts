import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input with cross-field validation. */
export const inputSchema = z
  .strictObject({
    hosts: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(20),
          capacityCpuHours: z.number().gt(0).max(64),
        }),
      )
      .min(2)
      .max(4),
    jobs: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(18),
          cpuHours: z.number().gt(0).max(64),
          initialHostId: z.string().min(0).max(20),
          finalHostId: z.string().min(0).max(20),
        }),
      )
      .min(2)
      .max(8),
    windowLabel: z.string().min(1).max(36),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
    }),
    emptyHostState: z.enum(["sleep", "available"]),
    showCapacityGuides: z.boolean(),
    copy: z.strictObject({
      before: z.string().min(0).max(28),
      after: z.string().min(0).max(28),
      work: z.string().min(0).max(28),
      occupied: z.string().min(0).max(28),
      sleep: z.string().min(0).max(28),
      available: z.string().min(0).max(28),
      unit: z.string().min(0).max(14),
      disclaimer: z.string().min(0).max(48),
    }),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    Array.from(["hosts", "jobs"] as const).forEach((field) => {
      if (
        new Set(input[field].map(prop<{ id: string }, "id", string>("id")))
          .size !== input[field].length
      ) {
        issue(field, "IDs must be unique, including an empty ID.");
      }
    });
    input.jobs.forEach((job) => {
      Array.from(["initialHostId", "finalHostId"] as const).forEach((field) => {
        if (!input.hosts.some(({ id }) => id === job[field])) {
          issue("jobs", "Both host references must exist.");
        }
      });
    });
    input.hosts.forEach((host) => {
      Array.from(["initialHostId", "finalHostId"] as const).forEach((field) => {
        const used = input.jobs
          .filter((job) => job[field] === host.id)
          .reduce((sum, job) => sum + job.cpuHours, 0);
        if (used > host.capacityCpuHours) {
          issue("jobs", "Each placement must fit every host capacity.");
        }
      });
    });
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Complete runtime-only and editorial constraints for consumers. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "compute-capacity-consolidation.0",
    paths: ["hosts.*.id"],
    description: "Host IDs are unique, including at most one empty ID.",
  },
  {
    id: "compute-capacity-consolidation.1",
    paths: ["jobs.*.id"],
    description: "Job IDs are unique, including at most one empty ID.",
  },
  {
    id: "compute-capacity-consolidation.2",
    paths: ["jobs.*.initialHostId", "jobs.*.finalHostId", "hosts.*.id"],
    description:
      "Both references must match a supplied host, including an authored empty ID.",
  },
  {
    id: "compute-capacity-consolidation.3",
    paths: [
      "hosts.*.capacityCpuHours",
      "jobs.*.cpuHours",
      "jobs.*.initialHostId",
      "jobs.*.finalHostId",
    ],
    description:
      "For each host in each placement, sum of assigned CPU-hours must be <= its capacity. Every job stays intact and occurs once. Work is CPU-hours, never elapsed time, kWh or emissions.",
  },
  {
    id: "compute-capacity-consolidation.4",
    paths: ["copy.unit", "windowLabel"],
    description:
      "The author preserves CPU-hour meaning and supplies a work window, not a measured energy saving.",
  },
];
