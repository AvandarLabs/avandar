import { Link } from "@avandar/ui";
import { Plural, Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { useUnlabeledValueCount } from "@/components/dataDictionaries/CodeListPopover/useUnlabeledValueCount";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
  columnName: string;
  codes: ColumnCodes.T;
};

/**
 * "3 values in the data have no target value." for a converted column, with a
 * link to add them on the dictionary. Mounted only while the popover is
 * open, so the count is read only when someone looks. Renders nothing
 * while it reads, and when every value has a target value.
 */
export function UnlabeledValuesNote({
  datasetId,
  columnName,
  codes,
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const { count } = useUnlabeledValueCount({ datasetId, columnName, codes });
  if (!count) {
    return null;
  }
  const { dictionaryName } = codes;
  const link = AppLinks.dataManagerDictionaryView({
    workspaceSlug: workspace.slug,
    dictionaryId: codes.dictionaryId,
    dictionaryName,
  });
  return (
    <Text size="xs">
      <Plural
        value={count}
        one="# value in the data has no target value."
        other="# values in the data have no target value."
      />{" "}
      {codes.isSourceDeleted ? null : (
        <Link to={link.to} params={link.params} size="xs">
          <Trans>Add them in {dictionaryName}</Trans>
        </Link>
      )}
    </Text>
  );
}
