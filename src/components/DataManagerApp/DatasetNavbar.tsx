import { Box, BoxProps, Loader, Title, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import * as LocalDataset from "@/models/LocalDataset";
import { NavLinkList } from "../ui/NavLinkList";
import type { NavLinkProps } from "@/components/ui/links/NavLink";

type Props = {
  datasets: LocalDataset.T[];
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

  const datasetLinks: readonly NavLinkProps[] = useMemo(() => {
    return datasets
      .map((dataset): NavLinkProps => {
        return {
          ...LocalDataset.getDatasetLinkProps(dataset.id),
          label: dataset.name,
          style: borderStyle,
        };
      })
      .concat([
        {
          to: AppConfig.links.dataImport.to,
          label: "Add new dataset",
          style: borderStyle,
        },
      ] as NavLinkProps[]);
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
