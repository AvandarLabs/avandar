import { Link } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup.module.css";
import { describeDictionaryUses } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/describeDictionaryUses/describeDictionaryUses";
import { DictionaryUseNote } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DictionaryUseNote";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { LinkedDataset } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";
import type { DictionaryUse } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/describeDictionaryUses/describeDictionaryUses";
import type { ReactNode } from "react";

type Props = {
  columnCodes: ReadonlyMap<string, ColumnCodes.T>;
  /** The linked datasets that read this dataset. */
  linkedDatasets: readonly LinkedDataset[];
};

/** A dictionary's name, linked, or "A deleted dictionary". */
function DictionaryName({ use }: Readonly<{ use: DictionaryUse }>): ReactNode {
  const workspace = useCurrentWorkspace();
  if (use.dictionaryId === "") {
    return (
      <Text span size="sm">
        <Trans>A deleted dictionary</Trans>
      </Text>
    );
  }
  const link = AppLinks.dataManagerDictionaryView({
    workspaceSlug: workspace.slug,
    dictionaryId: use.dictionaryId,
    dictionaryName: use.dictionaryName,
  });
  return (
    <Link to={link.to} params={link.params} size="sm">
      {use.dictionaryName}
    </Link>
  );
}

/**
 * The rail group naming each dictionary that reaches a dataset, one row
 * each, with every way it is applied underneath: attached as reference,
 * converted in place or as it loads, and each linked dataset that reads
 * this one. Nothing renders while no dictionary is attached.
 */
export function DatasetDictionariesRailGroup({
  columnCodes,
  linkedDatasets,
}: Readonly<Props>): ReactNode {
  const uses = describeDictionaryUses(columnCodes, linkedDatasets);
  if (uses.length === 0) {
    return null;
  }
  return (
    <AppViewRail.Group title={<Trans>Dictionaries</Trans>}>
      {uses.map((use) => {
        return (
          <div key={use.dictionaryId} className={css.dictionaryRow}>
            <dt className={css.dictionaryName}>
              <IconBook size={16} stroke={1.5} aria-hidden />
              <DictionaryName use={use} />
            </dt>
            {use.notes.map((note) => {
              const key = note.kind === "linked" ? note.datasetId : note.kind;
              return <DictionaryUseNote key={key} note={note} />;
            })}
          </div>
        );
      })}
    </AppViewRail.Group>
  );
}
