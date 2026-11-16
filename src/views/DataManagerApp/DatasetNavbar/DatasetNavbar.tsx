import { NavLinkList, TruncatedText } from "@avandar/ui";
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
  Tooltip as MantineTooltip,
} from "@mantine/core";
import {
  IconArrowMerge,
  IconBook,
  IconDatabaseOff,
  IconSearch,
} from "@tabler/icons-react";
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
import { DatasetParseStatusIndicator } from "@/views/DataManagerApp/DatasetParseStatusIndicator";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NavLinkProps } from "@avandar/ui";
import type { ReactNode } from "react";

/**
 * Below this many datasets the list is short enough to read in one pass, so
 * the filter field would cost a line and save nothing.
 */
const FILTER_VISIBLE_THRESHOLD = 8;

type Props = {
  datasets: Dataset.T[];
  /** Dictionaries listed in their own group below the datasets. */
  dictionaries?: readonly DataDictionary.T[];
  /** Crosswalks listed in their own group below the dictionaries. */
  crosswalks?: readonly Crosswalk.T[];
  isLoading: boolean;
  className?: string;
};

const NO_DICTIONARIES: readonly DataDictionary.T[] = [];
const NO_CROSSWALKS: readonly Crosswalk.T[] = [];

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

type DatasetNavbarNameProps = {
  name: string;
  /**
   * Replaces the full-name tooltip. An offline dataset uses this so hover
   * explains why the row cannot be opened.
   */
  tooltipLabel?: ReactNode;
};

/**
 * One dataset's name in `DatasetNavbar`. A name that does not fit the row
 * ends in an ellipsis, and hovering that name shows the rest.
 */
function DatasetNavbarName({
  name,
  tooltipLabel,
}: DatasetNavbarNameProps): ReactNode {
  return (
    <TruncatedText
      className={css.datasetNavbarName}
      size="sm"
      tooltipLabel={tooltipLabel}
      tooltipProps={{ position: "right" }}
    >
      {name}
    </TruncatedText>
  );
}

function makeDatasetLink(
  options: MakeDatasetLinkOptions,
): NavLinkProps & { key: string } {
  const { workspaceSlug, dataset, isOfflineUnavailable, showOfflineBadge } =
    options;

  const nameText = (
    <DatasetNavbarName
      name={dataset.name}
      tooltipLabel={
        isOfflineUnavailable ? <OfflineUnavailableTooltipLabel /> : undefined
      }
    />
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
    label: showOfflineBadge ? (
      <Group gap="xs" wrap="nowrap" justify="space-between">
        {nameText}
        <MantineTooltip
          label={<Trans>This dataset is fully available offline</Trans>}
        >
          <Badge size="xs" color="teal" variant="light">
            <Trans>Offline</Trans>
          </Badge>
        </MantineTooltip>
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

function makeDictionaryLink(options: {
  workspaceSlug: string;
  dictionary: DataDictionary.T;
}): NavLinkProps & { key: string } {
  const { workspaceSlug, dictionary } = options;
  // Destination only, for the same reasons as `makeDatasetLink`.
  const { to, params } = AppLinks.dataManagerDictionaryView({
    workspaceSlug,
    dictionaryId: dictionary.id,
    dictionaryName: dictionary.name,
  });
  return {
    key: dictionary.id,
    to,
    params,
    className: css.datasetNavbarLink,
    leftSection: <IconBook size={16} stroke={1.6} aria-hidden />,
    label: <DatasetNavbarName name={dictionary.name} />,
  } as NavLinkProps & { key: string };
}

function makeCrosswalkLink(options: {
  workspaceSlug: string;
  crosswalk: Crosswalk.T;
}): NavLinkProps & { key: string } {
  const { workspaceSlug, crosswalk } = options;
  // Destination only, for the same reasons as `makeDatasetLink`.
  const { to, params } = AppLinks.dataManagerCrosswalkView({
    workspaceSlug,
    crosswalkId: crosswalk.id,
    crosswalkName: crosswalk.name,
  });
  return {
    key: crosswalk.id,
    to,
    params,
    className: css.datasetNavbarLink,
    leftSection: <IconArrowMerge size={16} stroke={1.6} aria-hidden />,
    label: <DatasetNavbarName name={crosswalk.name} />,
  } as NavLinkProps & { key: string };
}

/** The crosswalks whose names contain the filter, as list rows. */
function useCrosswalkLinks(
  options: Readonly<{
    crosswalks: readonly Crosswalk.T[];
    filter: string;
    workspaceSlug: string;
  }>,
): ReadonlyArray<NavLinkProps & { key: string }> {
  const { crosswalks, filter, workspaceSlug } = options;
  return useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return crosswalks
      .filter((crosswalk) => {
        return (
          query === "" || crosswalk.name.toLocaleLowerCase().includes(query)
        );
      })
      .map((crosswalk) => {
        return makeCrosswalkLink({ workspaceSlug, crosswalk });
      });
  }, [crosswalks, filter, workspaceSlug]);
}

/**
 * The master pane of Data Sources: every dataset, dictionary, and crosswalk in
 * the workspace, datasets grouped by where they came from.
 *
 * The grouping is withheld while the workspace has only one kind of source,
 * because a single heading over every row labels nothing. The filter is
 * withheld on the same principle while the list is short.
 */
export function DatasetNavbar({
  datasets,
  dictionaries = NO_DICTIONARIES,
  crosswalks = NO_CROSSWALKS,
  isLoading,
  className,
}: Readonly<Props>): ReactNode {
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
      postgres_table: t`Database`,
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

  const matchingDictionaries = useMemo(() => {
    const query = deferredFilter.trim().toLocaleLowerCase();
    if (query === "") {
      return dictionaries;
    }
    return dictionaries.filter((dictionary) => {
      return dictionary.name.toLocaleLowerCase().includes(query);
    });
  }, [dictionaries, deferredFilter]);

  const dictionaryLinks = useMemo(() => {
    return matchingDictionaries.map((dictionary) => {
      return makeDictionaryLink({ workspaceSlug, dictionary });
    });
  }, [matchingDictionaries, workspaceSlug]);

  const crosswalkLinks = useCrosswalkLinks({
    crosswalks,
    filter: deferredFilter,
    workspaceSlug,
  });

  const totalCount = datasets.length + dictionaries.length + crosswalks.length;
  const isGrouped =
    datasetGroups.length +
      (dictionaryLinks.length > 0 ? 1 : 0) +
      (crosswalkLinks.length > 0 ? 1 : 0) >
    1;

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
            {totalCount === 0 ? (
              <Trans>No data yet</Trans>
            ) : (
              <Trans>Nothing matches your filter</Trans>
            )}
          </Text>
        </Stack>
      );
    },

    groups() {
      return (
        <>
          {datasetGroups.map((group) => {
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
          })}
          {dictionaryLinks.length > 0 ? (
            <div className={css.datasetNavbarGroup}>
              {isGrouped ? (
                <Text component="h4" className={css.datasetNavbarGroupTitle}>
                  <Trans>Dictionaries</Trans>
                </Text>
              ) : null}
              <NavLinkList
                links={dictionaryLinks}
                gap={6}
                inactiveHoverColor="neutral.1"
              />
            </div>
          ) : null}
          {crosswalkLinks.length > 0 ? (
            <div className={css.datasetNavbarGroup}>
              {isGrouped ? (
                <Text component="h4" className={css.datasetNavbarGroupTitle}>
                  <Trans>Crosswalks</Trans>
                </Text>
              ) : null}
              <NavLinkList
                links={crosswalkLinks}
                gap={6}
                inactiveHoverColor="neutral.1"
              />
            </div>
          ) : null}
        </>
      );
    },
  };

  return (
    <AppListPane
      className={className}
      title={<Trans>All data</Trans>}
      count={isLoading ? undefined : totalCount}
      action={isLoading ? <Loader size={14} /> : null}
      filter={
        totalCount >= FILTER_VISIBLE_THRESHOLD ? (
          <TextInput
            aria-label={t`Filter data`}
            placeholder={t`Filter data`}
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
      {isLoading && totalCount === 0
        ? elements.loading()
        : datasetGroups.length === 0 &&
            dictionaryLinks.length === 0 &&
            crosswalkLinks.length === 0
          ? elements.empty()
          : elements.groups()}
    </AppListPane>
  );
}
