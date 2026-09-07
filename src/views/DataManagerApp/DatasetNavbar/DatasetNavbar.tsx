import { NavLinkList } from "@avandar/ui";
import { makeBucketMap, prop } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Badge,
  Group,
  Loader,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconDatabaseOff, IconSearch } from "@tabler/icons-react";
import { useDeferredValue, useMemo, useState } from "react";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { AppListPane } from "@/components/layouts/AppListPane/AppListPane";
import { OfflineUnavailableTooltipLabel } from "@/components/offline/OfflineUnavailableTooltipLabel";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import css from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar.module.css";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import { DatasetParseStatusIndicator } from "@/views/DataManagerApp/DatasetParseStatusIndicator";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NavLinkProps } from "@avandar/ui";

/**
 * Below this many datasets the list is short enough to read in one pass, so
 * the filter field would cost a line and save nothing.
 */
const FILTER_VISIBLE_THRESHOLD = 8;

type Props = {
  datasets: Dataset.T[];
  isLoading: boolean;
};

type DatasetGroup = {
  sourceType: DatasetSource.SourceType;
  links: ReadonlyArray<NavLinkProps & { key: string }>;
};

type MakeDatasetLinkOptions = {
  workspaceSlug: string;
  dataset: Dataset.T;
  isOfflineUnavailable: boolean;
  showOfflineBadge: boolean;
};

function makeDatasetLink(
  options: MakeDatasetLinkOptions,
): NavLinkProps & { key: string } {
  const { workspaceSlug, dataset, isOfflineUnavailable, showOfflineBadge } =
    options;

  // `truncate` rather than `lineClamp`: a row is one line, and an ellipsis
  // says "there is more of this name" where a hard clip does not. Note that
  // `lineClamp` also needs the `-webkit-box` display it sets for itself, so
  // pairing it with an explicit `display` silently disables it.
  const nameText = (
    <Text size="sm" component="span" truncate>
      {dataset.name}
    </Text>
  );

  // Destination only, not the whole `AppLink`. Spreading it carried two
  // fields a nav row must not have: `isAvailableOffline`, a routing fact that
  // React rejects on the anchor it lands on, and `key`, which names the
  // *route* and is therefore the same constant for every dataset, so a list
  // of them all claimed one React key. The dataset's own id is the identity
  // that distinguishes these rows.
  const { to, params } = AppLinks.dataManagerDatasetView({
    workspaceSlug,
    datasetId: dataset.id,
    datasetName: dataset.name,
  });

  const link = {
    key: dataset.id,
    to,
    params,
    className: css.datasetNavbarLink,
    leftSection: <DatasetSourceIcon sourceType={dataset.sourceType} />,
    label: isOfflineUnavailable ? (
      <Tooltip label={<OfflineUnavailableTooltipLabel />}>{nameText}</Tooltip>
    ) : showOfflineBadge ? (
      <Group gap="xs" wrap="nowrap" justify="space-between">
        {nameText}
        <Tooltip label={<Trans>This dataset is fully available offline</Trans>}>
          <Badge size="xs" color="teal" variant="light">
            <Trans>Offline</Trans>
          </Badge>
        </Tooltip>
      </Group>
    ) : (
      nameText
    ),
    // Surface the async-import lifecycle on each dataset entry. The
    // indicator self-hides when the row is `parseStatus === "ready"`.
    rightSection: <DatasetParseStatusIndicator datasetId={dataset.id} />,
    disabled: isOfflineUnavailable,
  };
  return link as NavLinkProps & { key: string };
}

/**
 * The master pane of Data Sources: every dataset in the workspace, grouped
 * by where it came from.
 *
 * The grouping is withheld while the workspace has only one kind of source,
 * because a single heading over every row labels nothing. The filter is
 * withheld on the same principle while the list is short.
 */
export function DatasetNavbar({
  datasets,
  isLoading,
}: Readonly<Props>): JSX.Element {
  const workspace = useCurrentWorkspace();
  const workspaceSlug = workspace.slug;
  const { t } = useLingui();
  // The short form that heads a run of datasets from the same source. A
  // heading sits over a list, so it drops the singular noun a fact line
  // carries: "CSV" over three files rather than "CSV file".
  const sourceGroupLabels = useMemo((): Record<
    DatasetSource.SourceType,
    string
  > => {
    return {
      csv_file: t`CSV`,
      google_sheets: t`Google Sheets`,
      open_data: t`Open data`,
      pdf_file: t`PDF`,
      virtual: t`Derived`,
      xlsx_file: t`Excel`,
    };
  }, [t]);
  const [userProfile] = useCurrentUserProfile();
  const userId = userProfile?.userId;
  const [filter, setFilter] = useState("");
  const deferredFilter = useDeferredValue(filter);

  // Dataset ids with parquet cached locally for the current user/workspace.
  const [localDatasets = []] = LocalDatasetClient.useGetAll({
    where: {
      userId: { eq: userId! },
      workspaceId: { eq: workspace.id },
    },
    useQueryOptions: { enabled: !!userId },
  });
  const localDatasetIds = useMemo(() => {
    return new Set(localDatasets.map(prop("datasetId")));
  }, [localDatasets]);

  const isOnline = useIsOnline();

  const matchingDatasets = useMemo(() => {
    const query = deferredFilter.trim().toLocaleLowerCase();
    if (query === "") {
      return datasets;
    }
    return datasets.filter((dataset) => {
      return dataset.name.toLocaleLowerCase().includes(query);
    });
  }, [datasets, deferredFilter]);

  const datasetGroups: readonly DatasetGroup[] = useMemo(() => {
    const datasetsByType = makeBucketMap(matchingDatasets, {
      keyFn: prop("sourceType"),
    });

    return DatasetSource.SourceTypes.flatMap((sourceType) => {
      const datasetsOfType = datasetsByType.get(sourceType) ?? [];
      if (datasetsOfType.length === 0) {
        return [];
      }
      return [
        {
          sourceType,
          links: datasetsOfType.map((dataset) => {
            return makeDatasetLink({
              workspaceSlug,
              dataset,
              showOfflineBadge: !isOnline && localDatasetIds.has(dataset.id),
              isOfflineUnavailable:
                !isOnline && !localDatasetIds.has(dataset.id),
            });
          }),
        },
      ];
    });
  }, [matchingDatasets, localDatasetIds, workspaceSlug, isOnline]);

  const isGrouped = datasetGroups.length > 1;

  const elements = {
    loading() {
      return (
        <Stack gap={6} pt="xxs">
          <Skeleton height={28} radius="sm" />
          <Skeleton height={28} radius="sm" width="80%" />
          <Skeleton height={28} radius="sm" width="65%" />
        </Stack>
      );
    },

    empty() {
      return (
        <Stack gap="xs" align="center" py="lg" px="xs" ta="center">
          <IconDatabaseOff
            size={22}
            stroke={1.5}
            aria-hidden
            className={css.datasetNavbarEmptyIcon}
          />
          <Text size="sm" c="dimmed">
            {datasets.length === 0 ? (
              <Trans>No datasets yet</Trans>
            ) : (
              <Trans>No datasets match your filter</Trans>
            )}
          </Text>
        </Stack>
      );
    },

    groups() {
      return datasetGroups.map((group) => {
        return (
          <div key={group.sourceType} className={css.datasetNavbarGroup}>
            {isGrouped ? (
              <Text component="h4" className={css.datasetNavbarGroupTitle}>
                {sourceGroupLabels[group.sourceType]}
              </Text>
            ) : null}
            <NavLinkList
              links={group.links}
              gap={6}
              inactiveHoverColor="neutral.1"
            />
          </div>
        );
      });
    },
  };

  return (
    <AppListPane
      title={<Trans>Datasets</Trans>}
      count={isLoading ? undefined : datasets.length}
      action={isLoading ? <Loader size={14} /> : null}
      filter={
        datasets.length >= FILTER_VISIBLE_THRESHOLD ? (
          <TextInput
            aria-label={t`Filter datasets`}
            placeholder={t`Filter datasets`}
            leftSection={<IconSearch size={14} stroke={1.6} />}
            size="xs"
            value={filter}
            onChange={(event) => {
              setFilter(event.currentTarget.value);
            }}
          />
        ) : null
      }
    >
      {isLoading && datasets.length === 0
        ? elements.loading()
        : datasetGroups.length === 0
          ? elements.empty()
          : elements.groups()}
    </AppListPane>
  );
}
