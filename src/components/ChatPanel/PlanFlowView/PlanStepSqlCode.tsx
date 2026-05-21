import { AvaSqlBlock } from "@/components/AvaSqlBlock";

/**
 * Read-only SQL for a plan step with dataset/column pills.
 */
export function PlanStepSqlCode({ code }: { code: string }): JSX.Element {
  return (
    <AvaSqlBlock value={code} readOnly data-testid="plan-step-sql-editor" />
  );
}
