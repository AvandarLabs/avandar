import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock/AvaSqlBlock";

/**
 * Read-only SQL for a plan step with dataset/column pills.
 */
export function PlanStepSqlCode({ code }: { code: string }): React.ReactNode {
  return (
    <AvaSqlBlock value={code} readOnly data-testid="plan-step-sql-editor" />
  );
}
