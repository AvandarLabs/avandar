import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { DataGrid } from "@/lib/ui/DataGrid";
import { EntityDescriptionList } from "@/lib/ui/EntityDescriptionList";
import { FieldRenderOptionsMap } from "@/lib/ui/EntityDescriptionList/types";
import { type LocalDataset } from "@/models/LocalDataset";
import { useCSVParser } from "../hooks/useCSVParser";
import { useDeleteLocalDataset } from "../queries";

type Props = {
  dataset: LocalDataset;
};

const EXCLUDED_DATASET_KEYS = ["id", "name", "data", "description"] as const;
const DATASET_RENDER_OPTIONS: FieldRenderOptionsMap<LocalDataset> = {
  fields: {
    renderAsTable: true,
    titleKey: "name",
    excludeKeys: ["id"],
  },
};

/**
 * A view of the metadata for a dataset.
 *
 * TODO(pablo): We should show only a preview (first 100 rows) of the data.
 * Currently, we are still showing all data, which isn't great.
 */
export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const router = useRouter();
  const { csv, parseCSVString } = useCSVParser();
  const [deleteLocalDataset, isDeletePending] = useDeleteLocalDataset();

  useEffect(() => {
    parseCSVString(dataset.data);
  }, [dataset.data, parseCSVString]);

  return (
    <Container pt="lg">
      <Stack>
        <Title order={2}>{dataset.name}</Title>
        <Text>{dataset.description}</Text>

        <EntityDescriptionList
          entity={dataset}
          excludeKeys={EXCLUDED_DATASET_KEYS}
          entityFieldOptions={DATASET_RENDER_OPTIONS}
        />

        <Title order={5}>Data preview</Title>
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
                      to: APP_CONFIG.links.dataManager.to,
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
