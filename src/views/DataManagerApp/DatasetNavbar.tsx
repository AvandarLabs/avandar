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
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useLocalDatasetIds } from "@/lib/offline/useLocalDatasetIds";
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
}): NavLinkProps & { key: string } {
  const {
    workspaceSlug,
    datasetId,
    datasetName,
    style,
    label,
    showOfflineBadge,
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
      (showOfflineBadge ?
        <Group gap="xs" wrap="nowrap" justify="space-between">
          <Text size="sm" lineClamp={1}>
            {datasetName}
          </Text>
          <Tooltip
            label={
              <Trans>Available offline: parquet cached on this device</Trans>
            }
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
  };
  return link;
}

export function DatasetNavbar({
  datasets,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const { slug: workspaceSlug } = useCurrentWorkspace();
  const localDatasetIds = useLocalDatasetIds();
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const uploadedDatasetLinks = useMemo(() => {
    const datasetsByType = makeBucketMap(datasets, {
      keyFn: prop("sourceType"),
    });

    const datasetLinks = DatasetSource.SourceTypes.flatMap((sourceType) => {
      return (datasetsByType.get(sourceType) ?? []).map((dataset) => {
        return makeDatasetLink({
          workspaceSlug,
          datasetId: dataset.id,
          datasetName: dataset.name,
          style: borderStyle,
          showOfflineBadge: localDatasetIds.has(dataset.id),
        });
      });
    });

    return datasetLinks;
  }, [datasets, borderStyle, localDatasetIds, workspaceSlug]);

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
