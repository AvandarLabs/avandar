import {
  Box,
  BoxProps,
  Loader,
  NavLinkProps,
  ScrollArea,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { makeBucketMap } from "@utils/maps/makeBucketMap/makeBucketMap";
import { prop } from "@utils/objects/hofs/prop/prop";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
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
  label?: string;
}): NavLinkProps & { key: string } {
  const { workspaceSlug, datasetId, datasetName, style, label } = options;
  const link = {
    ...AppLinks.dataManagerDatasetView({
      workspaceSlug,
      datasetId,
      datasetName,
    }),
    style,
  };
  return label ? { ...link, label } : link;
}

export function DatasetNavbar({
  datasets,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const { slug: workspaceSlug } = useCurrentWorkspace();
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
        });
      });
    });

    return datasetLinks;
  }, [datasets, borderStyle, workspaceSlug]);

  const elements = {
    emptyList() {
      return (
        <Box ta="center" py="md">
          <Text>No datasets added yet</Text>
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
