import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Router, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppConfig } from "@/config/AppConfig";
import * as LocalDataset from "@/models/LocalDataset";
import { DataGrid } from "../ui/DataGrid";
import { DescriptionList } from "../ui/DescriptionListItem/DescriptionList";
import { useDeleteLocalDataset } from "./queries";
import { useCSV } from "./useCSV";

type Props = {
  dataset: LocalDataset.T;
};

export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const router = useRouter();
  const { csv, parseCSVString } = useCSV();
  const [deleteLocalDataset, isDeletePending] = useDeleteLocalDataset();

  useEffect(() => {
    parseCSVString(dataset.data);
  }, [dataset.data, parseCSVString]);

  return (
    <Container>
      <Stack>
        <Title order={2}>{dataset.name}</Title>
        <Text>{dataset.description}</Text>

        <DescriptionList>
          <DescriptionList.Item label="Delimiter">
            {dataset.delimiter}
          </DescriptionList.Item>
          <DescriptionList.Item label="First row is header">
            {dataset.firstRowIsHeader ? "Yes" : "No"}
          </DescriptionList.Item>
          <DescriptionList.Item label="File type">
            {dataset.mimeType}
          </DescriptionList.Item>
          <DescriptionList.Item label="Size in bytes">
            {dataset.sizeInBytes}
          </DescriptionList.Item>
          <DescriptionList.Item label="Created at">
            {dataset.createdAt.toISOString()}
          </DescriptionList.Item>
          <DescriptionList.Item label="Last updated">
            {dataset.updatedAt.toISOString()}
          </DescriptionList.Item>
        </DescriptionList>

        {csv ?
          <DataGrid fields={csv.meta.fields ?? []} data={csv.data ?? []} />
        : null}

        <Button
          color="danger"
          onClick={() => {
            modals.openConfirmModal({
              title: "Delete dataset",
              children: (
                <Text>Are you sure you want to delete {dataset.name}?</Text>
              ),
              labels: { confirm: "Delete", cancel: "Cancel" },
              confirmProps: {
                color: "danger",
                loading: isDeletePending,
              },
              onConfirm: () => {
                deleteLocalDataset(dataset.id, {
                  onSuccess: () => {
                    router.navigate({
                      to: AppConfig.links.dataManager.to,
                    });

                    notifications.show({
                      title: "Dataset deleted",
                      message: `${dataset.name} deleted successfully`,
                      color: "green",
                    });
                  },
                });
              },
            });
          }}
        >
          Delete Dataset
        </Button>
      </Stack>
    </Container>
  );
}
