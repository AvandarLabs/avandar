import { makeIdLookupMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { MultiSelect } from "@mantine/core";
import { useMemo } from "react";
import { StatusFilterOption } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilterOption";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  selectedStatusIds: readonly ConceptStatus.Id[];
  onChange: (statusIds: ConceptStatus.Id[]) => void;
};

/**
 * Narrows the records list to the statuses picked. Picking none shows
 * every record.
 */
export function StatusFilter({
  statuses,
  selectedStatusIds,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const statusesById = useMemo(() => {
    return makeIdLookupMap(statuses);
  }, [statuses]);
  const options = useMemo(() => {
    return statuses.map((status) => {
      return { value: status.id, label: status.name };
    });
  }, [statuses]);

  return (
    <MultiSelect<ConceptStatus.Id>
      size="xs"
      searchable
      clearable
      aria-label={t`Filter by status`}
      clearButtonProps={{ "aria-label": t`Show every status` }}
      placeholder={selectedStatusIds.length === 0 ? t`All statuses` : undefined}
      data={options}
      value={[...selectedStatusIds]}
      onChange={onChange}
      renderOption={({ option }) => {
        return <StatusFilterOption status={statusesById.get(option.value)} />;
      }}
    />
  );
}
