import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  columnCodes: ReadonlyMap<string, ColumnCodes.T>;
};

/** Each attached dictionary once, sorted by name. */
function _listDictionaries(
  columnCodes: ReadonlyMap<string, ColumnCodes.T>,
): Array<{ id: string; name: string }> {
  const byId = new Map<string, string>();
  columnCodes.forEach((codes) => {
    byId.set(codes.dictionaryId, codes.dictionaryName);
  });
  return [...byId]
    .map(([id, name]) => {
      return { id, name };
    })
    .sort((dictionaryA, dictionaryB) => {
      return dictionaryA.name < dictionaryB.name ? -1 : 1;
    });
}

/**
 * The rail group naming each dictionary attached to a dataset and how it
 * was applied. Nothing renders while no dictionary is attached.
 */
export function DatasetDictionariesRailGroup({
  columnCodes,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const dictionaries = _listDictionaries(columnCodes);
  if (dictionaries.length === 0) {
    return null;
  }
  return (
    <AppViewRail.Group title={<Trans>Dictionaries</Trans>}>
      {dictionaries.map((dictionary) => {
        const link = AppLinks.dataManagerDictionaryView({
          workspaceSlug: workspace.slug,
          dictionaryId: dictionary.id,
          dictionaryName: dictionary.name,
        });
        return (
          <AppViewRail.Fact key={dictionary.id} label={t`Dictionary`}>
            <Link to={link.to} params={link.params} size="sm">
              {dictionary.name}
            </Link>
            <Text component="span" display="block" size="xs" c="dimmed">
              <Trans>Attached as reference · data unchanged</Trans>
            </Text>
          </AppViewRail.Fact>
        );
      })}
    </AppViewRail.Group>
  );
}
