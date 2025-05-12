import { Box, BoxProps, Loader, Title, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { LocalDataset } from "@/models/LocalDataset/types";
import { getDatasetLinkProps } from "@/models/LocalDataset/utils";

type Props = {
  datasets: LocalDataset[];
  isLoading: boolean;
} & BoxProps;

export function DatasetNavbar({
  datasets,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const datasetLinks = useMemo(() => {
    return [
      ...datasets.map((dataset) => {
        return {
          ...getDatasetLinkProps(dataset.id),
          label: dataset.name,
          style: borderStyle,
          linkKey: dataset.id,
        };
      }),
      {
        to: APP_CONFIG.links.dataImport.to,
        label: "Add new dataset",
        style: borderStyle,
        linkKey: "create-new",
      },
    ];
  }, [datasets, borderStyle]);

  return (
    <Box bg="neutral.0" pt="lg" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <Title pl="sm" order={3}>
        Datasets
      </Title>
      <NavLinkList
        pt="md"
        links={datasetLinks}
        pr="md"
        inactiveHoverColor="neutral.1"
      />
    </Box>
  );
}
