import { Trans } from "@lingui/react/macro";
import {
  Badge,
  Box,
  BoxProps,
  Group,
  Loader,
  NavLinkProps,
  ScrollArea,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { NavLinkList } from "@ui";
import { makeBucketMap, prop } from "@utils";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useMemo } from "react";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { OfflineUnavailableTooltipLabel } from "@/components/offline/OfflineUnavailableTooltipLabel";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { DatasetParseStatusIndicator } from "@/views/DataManagerApp/DatasetParseStatusIndicator";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  datasets: Dataset.T[];
  isLoading: boolean;
} & BoxProps;

function makeDatasetLink(options: {
  workspaceSlug: string;
  datasetId: Dataset.Id;
  datasetName: string;
  style?: NavLinkProps["style"];
  label?: NavLinkProps["label"];
  showOfflineBadge?: boolean;
  isOfflineUnavailable?: boolean;
}): NavLinkProps & { key: string } {
  const {
    workspaceSlug,
    datasetId,
    datasetName,
    style,
    label,
    showOfflineBadge,
    isOfflineUnavailable = false,
  } = options;
  const link = {
    ...AppLinks.dataManagerDatasetView({
      workspaceSlug,
      datasetId,
      datasetName,
    }),
    style,
    label:
      label ??
      (isOfflineUnavailable ?
        <Tooltip label={<OfflineUnavailableTooltipLabel />}>
          <Text size="sm" lineClamp={1} component="span" display="block">
            {datasetName}
          </Text>
        </Tooltip>
      : showOfflineBadge ?
        <Group gap="xs" wrap="nowrap" justify="space-between">
          <Text size="sm" lineClamp={1}>
            {datasetName}
          </Text>
          <Tooltip
            label={<Trans>This dataset is fully available offline</Trans>}
          >
            <Badge size="xs" color="teal" variant="light">
              <Trans>Offline</Trans>
            </Badge>
          </Tooltip>
        </Group>
      : datasetName),
    // Surface the async-import lifecycle on each dataset entry. The
    // indicator self-hides when the row is `parseStatus === "ready"`.
    rightSection: <DatasetParseStatusIndicator datasetId={datasetId} />,
    disabled: isOfflineUnavailable,
  };
  return link as NavLinkProps & { key: string };
}

export function DatasetNavbar({
  datasets,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const workspaceSlug = workspace.slug;
  const [userProfile] = useCurrentUserProfile();
  const userId = userProfile?.userId;

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

  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);
  const isOnline = useIsOnline();

  const uploadedDatasetLinks = useMemo(() => {
    const datasetsByType = makeBucketMap(datasets, {
      keyFn: prop("sourceType"),
    });

    const datasetLinks = DatasetSource.SourceTypes.flatMap((sourceType) => {
      return (datasetsByType.get(sourceType) ?? []).map((dataset) => {
        const isOfflineUnavailable =
          !isOnline && !localDatasetIds.has(dataset.id);

        return makeDatasetLink({
          workspaceSlug,
          datasetId: dataset.id,
          datasetName: dataset.name,
          style: borderStyle,
          showOfflineBadge: !isOnline && localDatasetIds.has(dataset.id),
          isOfflineUnavailable,
        });
      });
    });

    return datasetLinks;
  }, [datasets, borderStyle, localDatasetIds, workspaceSlug, isOnline]);

  const elements = {
    emptyList() {
      return (
        <Box ta="center" py="md">
          <Text>
            <Trans>No datasets added yet</Trans>
          </Text>
        </Box>
      );
    },
    mainContent() {
      return (
        <NavLinkList
          links={uploadedDatasetLinks}
          pt="md"
          pr="md"
          gap="xs"
          inactiveHoverColor="neutral.1"
          h="100%"
          style={{ minHeight: 0 }}
        />
      );
    },
  };

  return (
    <Box
      bg="neutral.0"
      style={{ minHeight: 0, alignSelf: "stretch" }}
      {...boxProps}
    >
      <ScrollArea h="100%" w="100%">
        {isLoading ?
          <Loader />
        : null}
        {uploadedDatasetLinks.length === 0 ?
          elements.emptyList()
        : elements.mainContent()}
      </ScrollArea>
    </Box>
  );
}
