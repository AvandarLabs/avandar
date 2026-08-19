import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Menu, Tooltip } from "@mantine/core";
import { IconChevronDown, IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { useNuxExplorerSaveMenu } from "@/components/Nux/NuxTour/useNuxExplorerSaveMenu";
import { DataExplorerOpenDatasetMenuItems } from "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerOpenDatasetMenuItems";
import { DataExplorerSaveAsMenuItems } from "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveAsMenuItems";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { ReactNode } from "react";

type Props = {
  savableSql: string | undefined;
  queryResultData: UnknownDataFrame;
  queryResultColumns: readonly QueryResult.Column[];
  dateColumns: ReadonlySet<string>;
  workspaceSlug: string;
};

/**
 * The Data Explorer toolbar's Save dropdown.
 *
 * Owns save-over/delete for an open dataset alongside save-as and save-to-
 * dashboard, because all four are reachable only from this menu.
 */
export function DataExplorerSaveMenu({
  savableSql,
  queryResultData,
  queryResultColumns,
  dateColumns,
  workspaceSlug,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { shouldHoldOpen, shouldForceCreateMode } = useNuxExplorerSaveMenu();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isSaveDisabled =
    queryResultData.length === 0 || savableSql === undefined;
  const runAQueryFirstHint =
    savableSql === undefined ?
      <Tooltip label={t`Run a query first.`}>
        <IconInfoCircle size={16} />
      </Tooltip>
    : null;
  return (
    <Menu
      shadow="md"
      width={240}
      opened={isMenuOpen || shouldHoldOpen}
      onChange={setIsMenuOpen}
      closeOnClickOutside={!shouldHoldOpen}
    >
      <Menu.Target>
        <Button
          variant="outline"
          color="neutral"
          size="compact-sm"
          rightSection={<IconChevronDown size={16} />}
          {...NuxAnchors.props(NuxAnchors.ids.explorerSaveMenu)}
        >
          <Trans>Save</Trans>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <DataExplorerOpenDatasetMenuItems />
        <DataExplorerSaveAsMenuItems
          savableSql={savableSql ?? ""}
          queryResultData={queryResultData}
          queryResultColumns={queryResultColumns}
          dateColumns={dateColumns}
          workspaceSlug={workspaceSlug}
          isSaveDisabled={isSaveDisabled}
          runAQueryFirstHint={runAQueryFirstHint}
          shouldForceCreateMode={shouldForceCreateMode}
        />
      </Menu.Dropdown>
    </Menu>
  );
}
