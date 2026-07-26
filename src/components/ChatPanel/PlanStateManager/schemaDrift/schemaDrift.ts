import { APIClient } from "@/clients/APIClient";
import type {
  executePlanStep as _executePlanStep,
  PlanExecutorDispatch,
} from "@/components/ChatPanel/PlanStateManager/planExecutor";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatPlan, SchemaDriftReport } from "$/types/chat.types";

/**
 * Schema-Drift Regen.
 *
 * After a plan step succeeds, the executor compares its actualSchema
 * against the LLM's predictedSchema. When they differ, the runtime
 * asks the model to regenerate the downstream steps that depend on
 * the drifted one. Cap is ≤2 attempts per (step, plan) pair to keep
 * the cost bounded; on the 3rd drift we leave the user with a manual
 * intervention banner.
 */

export const MAX_REGEN_ATTEMPTS = 2;

/**
 * Strict equality of two schemas:
 *   - same column count
 *   - same names in the same order
 *   - same types (case-insensitive; DuckDB uppercases its types,
 *     pandas mirrors that, but to be safe we normalise)
 *
 * Column-order matters because downstream SQL referring to `SELECT
 * col_3 FROM step_x` will break if column order shifts even when
 * names are preserved.
 */
export function isSchemaDrift(
  predicted: ReadonlyArray<{ name: string; type: string }>,
  actual: ReadonlyArray<{ name: string; type: string }>,
): boolean {
  if (predicted.length !== actual.length) {
    return true;
  }
  return predicted.some((p, i) => {
    return (
      p.name !== actual[i]!.name ||
      p.type.toLowerCase() !== actual[i]!.type.toLowerCase()
    );
  });
}

/**
 * Find every step in the plan that transitively depends on the
 * drifted step. Used to build the affected-step-id list for the
 * regen request.
 */
export function findAffectedDownstream(args: {
  plan: ChatPlan;
  driftedStepId: string;
}): string[] {
  const { plan, driftedStepId } = args;
  const dependents = new Map<string, string[]>();
  plan.steps.forEach((step) => {
    step.inputs.forEach((inputId) => {
      const arr = dependents.get(inputId) ?? [];
      arr.push(step.id);
      dependents.set(inputId, arr);
    });
  });
  const affected: string[] = [];
  const queue = [driftedStepId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    const ch = dependents.get(id) ?? [];
    for (const childId of ch) {
      if (seen.has(childId)) {
        continue;
      }
      seen.add(childId);
      affected.push(childId);
      queue.push(childId);
    }
  }
  return affected;
}

/**
 * Run the regen round trip: hit the backend, dispatch the
 * `replaceStepCode` action for each step the model rewrote, and
 * re-run those steps via the supplied `runStep` callable.
 *
 * Returns the number of steps successfully regenerated.
 */
export async function regenerateOnDrift(args: {
  workspaceId: Workspace.Id;
  plan: ChatPlan;
  driftedStep: PlanNode;
  affectedStepIds: string[];
  model?: string;
  dispatch: PlanExecutorDispatch;
  runStep: (stepId: string) => Promise<void>;
}): Promise<{
  regeneratedCount: number;
  explanation: string;
}> {
  const driftReport: SchemaDriftReport = {
    driftedStepId: args.driftedStep.id,
    driftedStepDescription: args.driftedStep.description,
    predictedSchema: args.driftedStep.predictedSchema,
    actualSchema: args.driftedStep.actualSchema ?? [],
    affectedStepIds: args.affectedStepIds,
    plan: args.plan,
  };

  const response = await APIClient.post({
    route: "chat/:workspaceId/regenerate-plan",
    pathParams: { workspaceId: args.workspaceId },
    body: { driftReport, model: args.model },
  });

  response.steps.forEach((updated) => {
    args.dispatch.replaceStepCode({
      stepId: updated.stepId,
      code: updated.code,
    });
  });

  // Re-run the steps the model rewrote, in plan order so each
  // step's view is registered before the next references it.
  const orderById = new Map(
    args.plan.steps.map((s, idx) => {
      return [s.id, idx] as const;
    }),
  );
  const ordered = [...response.steps].sort((a, b) => {
    return (orderById.get(a.stepId) ?? 0) - (orderById.get(b.stepId) ?? 0);
  });
  for (const updated of ordered) {
    await args.runStep(updated.stepId);
  }

  return {
    regeneratedCount: response.steps.length,
    explanation: response.explanation,
  };
}
