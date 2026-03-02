import {
  Box,
  BoxProps,
  Loader,
  NavLinkProps,
  ScrollArea,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { makeBucketMap } from "@/lib/utils/maps/makeBucketMap";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { Dataset, DatasetId } from "@/models/datasets/Dataset";
import { Datasets } from "@/models/datasets/Dataset/Datasets";

type Props = {
  datasets: Dataset[];
  isLoading: boolean;
} & BoxProps;

function makeDatasetLink(options: {
  workspaceSlug: string;
  datasetId: DatasetId;
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

    const datasetLinks = Datasets.SourceTypes.flatMap((sourceType) => {
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
        <Box ta="center">
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
