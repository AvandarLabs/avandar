import {
  Box,
  BoxProps,
  Loader,
  NavLinkProps,
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

  const [uploadedDatasetLinks] = useMemo(() => {
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

    return [
      [
        ...datasetLinks,
        {
          to: AppLinks.dataImport(workspaceSlug).to,
          label: "Add new dataset",
          style: borderStyle,
          key: "create-new",
        },
      ],
    ];
  }, [datasets, borderStyle, workspaceSlug]);

  return (
    <Box bg="neutral.1" pt="lg" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <NavLinkList
        pt="md"
        links={uploadedDatasetLinks}
        pr="md"
        inactiveHoverColor="neutral.1"
      />
    </Box>
  );
}
