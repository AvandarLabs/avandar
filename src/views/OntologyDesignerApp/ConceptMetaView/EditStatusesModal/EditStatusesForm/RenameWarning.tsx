import { Callout } from "@avandar/ui";
import { makeIdLookupMap, prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  savedStatuses: readonly ConceptStatus.T[];
  statuses: readonly ConceptStatus.Draft[];
};

/**
 * Warns before a saved status is renamed. Saved filters and dashboards match
 * a status by its name, so a filter on the old name stops finding records
 * once the new name is saved.
 */
export function RenameWarning({
  savedStatuses,
  statuses,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const renamedNames = useMemo(() => {
    const draftsById = makeIdLookupMap(statuses);
    return savedStatuses
      .filter((saved) => {
        const draft = draftsById.get(saved.id);
        return draft !== undefined && draft.name.trim() !== saved.name;
      })
      .map(prop("name"));
  }, [savedStatuses, statuses]);

  if (renamedNames.length === 0) {
    return null;
  }

  const renamedList = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(renamedNames);
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={18} aria-hidden />}
      messageSize="sm"
      message={t`Saved filters and dashboards find records by status name. Filters that use ${renamedList} will stop finding records once you save.`}
    />
  );
}
