import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { downloadRowsAsCsv } from "@/views/DataExplorerApp/downloadRowsAsCsv";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import { FeatureListTable } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListTable";
import { makeCsvRowsFromFeatureList } from "@/views/GisApp/panels/FeatureListDrawer/makeCsvRowsFromFeatureList/makeCsvRowsFromFeatureList";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { FeatureListQueryState } from "@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery";
import type { ReactNode } from "react";

/**
 * Smallest count an approximate-location layer shows exactly. Below it the
 * drawer says "Fewer than 5 features", since a small exact count can point
 * at individual people even when their locations are jittered.
 */
const MIN_EXACT_APPROXIMATE_COUNT = 5;

type Props = {
  state: FeatureListQueryState;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/**
 * Identifies a list's columns, so a table keyed by it resets its sort when a
 * column appears or disappears, for example a distance column once the layer
 * is filtered by a buffer.
 */
function _getColumnsKey(list: MapLayerFeatureList): string {
  return JSON.stringify(
    list.columns.map((column) => {
      return column.key;
    }),
  );
}

function FeatureCountText({ count }: { count: number }): ReactNode {
  return (
    <Text size="sm" fw={600}>
      <Plural value={count} one="# feature" other="# features" />
    </Text>
  );
}

function FeatureListMessage({
  children,
  isError = false,
}: {
  children: ReactNode;
  isError?: boolean;
}): ReactNode {
  return (
    <Text
      size="sm"
      c={isError ? "danger" : "dimmed"}
      className={css.featureListMessage}
    >
      {children}
    </Text>
  );
}

/** The count, suppressed below a minimum, and why rows are not listed. */
function ApproximateFeatureCount({ count }: { count: number }): ReactNode {
  return (
    <Stack gap={4} className={css.featureListMessage}>
      {count < MIN_EXACT_APPROXIMATE_COUNT ? (
        <Text size="sm" fw={600}>
          <Trans>Fewer than {MIN_EXACT_APPROXIMATE_COUNT} features</Trans>
        </Text>
      ) : (
        <FeatureCountText count={count} />
      )}
      <Text size="sm" c="dimmed">
        <Trans>
          This layer shows approximate locations, so its features are not listed
          one by one. Listing exact rows would undo that protection.
        </Trans>
      </Text>
    </Stack>
  );
}

/** The count, the CSV download, and the sortable table. */
function FeatureListRows({
  list,
  onRowClick,
}: {
  list: MapLayerFeatureList;
  onRowClick: Props["onRowClick"];
}): ReactNode {
  const { i18n, t } = useLingui();
  return (
    <>
      <Group className={css.featureListToolbar} justify="space-between">
        <FeatureCountText count={list.totalCount} />
        <Button
          size="compact-sm"
          variant="light"
          color="neutral"
          leftSection={<IconDownload size={14} aria-hidden />}
          disabled={list.rows.length === 0}
          onClick={() => {
            downloadRowsAsCsv(makeCsvRowsFromFeatureList({ list, i18n }));
          }}
        >
          {t`Download CSV`}
        </Button>
      </Group>
      <FeatureListTable
        key={_getColumnsKey(list)}
        list={list}
        onRowClick={onRowClick}
      />
    </>
  );
}

/**
 * The feature list drawer's content: a count, then either the table with a
 * CSV download or, for approximate locations, why rows are hidden.
 * Rendered by `FeatureListDrawer`.
 */
export function FeatureListBody({ state, onRowClick }: Props): ReactNode {
  if (state.access === "unavailable") {
    return (
      <FeatureListMessage>
        <Trans>This layer's features cannot be listed.</Trans>
      </FeatureListMessage>
    );
  }
  if (state.error) {
    return (
      <FeatureListMessage isError>
        <Trans>The feature list could not load.</Trans>
      </FeatureListMessage>
    );
  }
  if (state.access === "countOnly" && state.count !== undefined) {
    return <ApproximateFeatureCount count={state.count} />;
  }
  if (state.access === "rows" && state.list) {
    return <FeatureListRows list={state.list} onRowClick={onRowClick} />;
  }
  return (
    <FeatureListMessage>
      <Trans>Loading features...</Trans>
    </FeatureListMessage>
  );
}
