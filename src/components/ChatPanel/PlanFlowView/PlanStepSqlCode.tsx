import { SqlEditor } from "@/components/SqlEditor";
import { useSqlDisplayCatalog } from "@/hooks/sql/useSqlDisplayCatalog.ts";

/**
 * Read-only SQL for a plan step with dataset/column pills.
 */
export function PlanStepSqlCode({ code }: { code: string }): JSX.Element {
  const { catalog } = useSqlDisplayCatalog();
  return (
    <SqlEditor
      value={code}
      onChange={() => {}}
      catalog={catalog}
      readOnly
      minRows={4}
      data-testid="plan-step-sql-editor"
    />
  );
}
