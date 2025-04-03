import { Box, Loader, Title, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import * as LocalDataset from "@/models/LocalDataset";
import { NavLinkList } from "../ui/NavLinkList";
import type { NavLinkProps } from "@/components/ui/NavLink";

type Props = {
  datasets: LocalDataset.T[];
  isLoading: boolean;
};

export function DatasetNavbar({ datasets, isLoading }: Props): JSX.Element {
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
          className: "[&:not(.active)]:hover:bg-neutral-100",
          label: dataset.name,
          style: borderStyle,
        };
      })
      .concat([
        {
          to: AppConfig.links.dataImport.to,
          className: "[&:not(.active)]:hover:bg-neutral-100",
          label: "Add new dataset",
          style: borderStyle,
        },
      ] as NavLinkProps[]);
  }, [datasets, borderStyle]);

  return (
    <Box bg="neutral.0" h="100%" pt="lg">
      {isLoading ?
        <Loader />
      : null}
      <Title pl="sm" order={3}>
        Datasets
      </Title>
      <NavLinkList pt="md" links={datasetLinks} pr="md" />
    </Box>
  );
}
