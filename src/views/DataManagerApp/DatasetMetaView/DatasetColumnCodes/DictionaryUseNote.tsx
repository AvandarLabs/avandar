import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/DatasetDictionariesRailGroup.module.css";
import type { DictionaryUseNote as DictionaryUseNoteT } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/describeDictionaryUses/describeDictionaryUses";
import type { ReactNode } from "react";

type Props = {
  note: DictionaryUseNoteT;
  /** Shown under a pinned version that is behind, such as Re-apply. */
  action?: ReactNode;
};

/** A linked dataset that reads this one, linked by name. */
function LinkedDatasetNote({
  datasetId,
  datasetName,
}: Readonly<{ datasetId: string; datasetName: string }>): ReactNode {
  const workspace = useCurrentWorkspace();
  const link = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId,
    datasetName,
  });
  const datasetLink = (
    <Link to={link.to} params={link.params} size="xs">
      {datasetName}
    </Link>
  );
  return <Trans>Linked dataset: {datasetLink}</Trans>;
}

/**
 * The pinned version, how far behind the dictionary it is, and `action`
 * when it is behind and a pinned column still has a code list to re-pin.
 */
function PinnedNote({
  appliedVersion,
  currentVersion,
  canReapply,
  action,
}: Readonly<{
  appliedVersion: number;
  currentVersion: number | undefined;
  canReapply: boolean;
  action?: ReactNode;
}>): ReactNode {
  const { i18n } = useLingui();
  const isBehind =
    currentVersion !== undefined && currentVersion > appliedVersion;
  const appliedText = i18n.number(appliedVersion);
  const nowText = i18n.number(currentVersion ?? appliedVersion);
  return (
    <>
      <Trans>Converted this dataset · version {appliedText}</Trans>
      {isBehind ? (
        <Text span display="block" size="xs" c="warning">
          <Trans>
            Applied version {appliedText}, now version {nowText}
          </Trans>
        </Text>
      ) : null}
      {isBehind && canReapply ? action : null}
    </>
  );
}

/**
 * One line under a dictionary in a dataset's rail, saying one way the
 * dictionary reaches the dataset.
 */
export function DictionaryUseNote({
  note,
  action,
}: Readonly<Props>): ReactNode {
  return (
    <Text component="dd" size="xs" c="dimmed" className={css.dictionaryNote}>
      {note.kind === "reference" ? (
        <Trans>Attached as reference · data unchanged</Trans>
      ) : null}
      {note.kind === "converted_live" ? (
        <Trans>Converted as it loads · follows the dictionary</Trans>
      ) : null}
      {note.kind === "converted_pinned" ? (
        <PinnedNote
          appliedVersion={note.appliedVersion}
          currentVersion={note.currentVersion}
          canReapply={note.canReapply}
          action={action}
        />
      ) : null}
      {note.kind === "linked" ? (
        <LinkedDatasetNote
          datasetId={note.datasetId}
          datasetName={note.datasetName}
        />
      ) : null}
    </Text>
  );
}
