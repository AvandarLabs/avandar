import { Loader, Stack } from "@mantine/core";
import { useMemo } from "react";
import * as LocalDataset from "@/models/LocalDataset";
import { NavLinkList } from "../ui/NavLinkList";
import { UnstyledButtonLink } from "../ui/UnstyledButtonLink";

type Props = {
  datasets: LocalDataset.T[];
  isLoading: boolean;
};

export function DatasetLinkList({ datasets, isLoading }: Props): JSX.Element {
  const datasetLinks = useMemo(() => {
    return datasets.map((dataset) => {
      return {
        ...LocalDataset.getDatasetLinkProps(dataset.id),
        label: dataset.name,
      };
    });
  }, [datasets]);

  return (
    <>
      {isLoading ?
        <Loader />
      : null}
      <Stack>
        <NavLinkList links={datasetLinks} />
        <UnstyledButtonLink pl="sm" to="/data-manager/data-import">
          Add new dataset
        </UnstyledButtonLink>
      </Stack>
    </>
  );
}
