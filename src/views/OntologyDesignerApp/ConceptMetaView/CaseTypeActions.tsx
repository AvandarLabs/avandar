import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { CaseTypeActionsMenu } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActionsMenu";
import { RefreshRecordsButton } from "@/views/OntologyDesignerApp/ConceptMetaView/RefreshRecordsButton";
import { ViewRecordsButton } from "@/views/OntologyDesignerApp/ConceptMetaView/ViewRecordsButton";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  fullConcept: Concept.T<"Full">;
};

/**
 * The case type page's header actions. Each is hidden, not disabled, from a
 * user whose roles do not allow it: refreshing records takes editor access
 * to Case Types or to Case Records, opening the records takes Case Records
 * access, and deleting the case type takes Case Types admin.
 */
export function CaseTypeActions({
  concept,
  fullConcept,
}: Readonly<Props>): ReactNode {
  const canSyncAsCaseTypesEditor = useHasPermission(
    "case_types__can_sync_records",
  );
  const canSyncAsRecordsEditor = useHasPermission(
    "case_records__can_sync_records",
  );
  const canViewRecords = useHasPermission("case_records__can_view_record");
  const canDeleteCaseType = useHasPermission(
    "case_types__can_delete_case_type",
  );

  return (
    <>
      {canSyncAsCaseTypesEditor || canSyncAsRecordsEditor ? (
        <RefreshRecordsButton concept={concept} fullConcept={fullConcept} />
      ) : null}
      {canViewRecords ? <ViewRecordsButton concept={concept} /> : null}
      {canDeleteCaseType ? <CaseTypeActionsMenu concept={concept} /> : null}
    </>
  );
}
