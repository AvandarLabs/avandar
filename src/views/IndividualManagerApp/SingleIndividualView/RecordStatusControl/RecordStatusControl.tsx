import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import { RecordStatusMenu } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusMenu";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  currentStatusId: ConceptStatus.Id;
  /** Whether the user may change a record's status. */
  canEdit: boolean;
  onChange: (statusId: ConceptStatus.Id) => void;
};

/**
 * A record's status beside its name. A user who may change it gets a menu
 * of every status; everyone else gets the badge. Both show what the status
 * means on hover and focus. The control is hidden rather than disabled for
 * a user who cannot change it.
 */
export function RecordStatusControl({
  statuses,
  currentStatusId,
  canEdit,
  onChange,
}: Readonly<Props>): ReactNode {
  const currentStatus = statuses.find((status) => {
    return status.id === currentStatusId;
  });
  if (!currentStatus) {
    return null;
  }
  return canEdit ? (
    <RecordStatusMenu
      statuses={statuses}
      currentStatus={currentStatus}
      onChange={onChange}
    />
  ) : (
    <StatusBadge
      name={currentStatus.name}
      color={currentStatus.color}
      description={currentStatus.description}
    />
  );
}
