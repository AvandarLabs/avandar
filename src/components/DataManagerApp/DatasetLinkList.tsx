import { Group, Loader, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import * as LocalDataset from "@/models/LocalDataset";
import { NavLinkList } from "../ui/NavLinkList";
import type { NavLinkProps } from "@/components/ui/NavLink";

type Props = {
  datasets: LocalDataset.T[];
  isLoading: boolean;
};

export function DatasetLinkList({ datasets, isLoading }: Props): JSX.Element {
  const datasetLinks: readonly NavLinkProps[] = useMemo(() => {
    return datasets
      .map((dataset): NavLinkProps => {
        return {
          ...LocalDataset.getDatasetLinkProps(dataset.id),
          label: <Text span>{dataset.name}</Text>,
        };
      })
      .concat([
        {
          to: AppConfig.links.dataImport.to,
          label: (
            <Group gap="xs">
              <Text span>Add new dataset</Text>
              <IconPlus size={16} />
            </Group>
          ),
          style: {
            backgroundColor: "red",
          },
        },
      ] as NavLinkProps[]);
  }, [datasets]);

  return (
    <>
      {isLoading ?
        <Loader />
      : null}
      <Stack>
        <NavLinkList links={datasetLinks} />
      </Stack>
    </>
  );
}
