import { Plural, Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { getLayoutLabel } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/getLayoutLabel";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  layout: Pick<CrosswalkDraft.Layout, "datasetIds">;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  /** The id other controls point at to say which layout they act on. */
  nameId?: string;
};

/**
 * A layout's name: its first dataset's name, and under it "+{count} with
 * the same layout" when other datasets share it.
 */
export function LayoutName({
  layout,
  datasetsById,
  nameId,
}: Readonly<Props>): ReactNode {
  const { firstDatasetName, otherDatasetCount } = getLayoutLabel(
    layout,
    datasetsById,
  );
  return (
    <Stack gap={0} miw={0}>
      <Text id={nameId} size="sm" fw={500} truncate>
        {firstDatasetName ?? <Trans>No datasets left</Trans>}
      </Text>
      {otherDatasetCount > 0 ? (
        <Text size="xs" c="dimmed">
          <Plural
            value={otherDatasetCount}
            one="+# with the same layout"
            other="+# with the same layout"
          />
        </Text>
      ) : null}
    </Stack>
  );
}
