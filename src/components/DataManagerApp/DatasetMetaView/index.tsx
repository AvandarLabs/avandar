import { Button, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/AppConfig";
import { DataGrid } from "@/lib/ui/DataGrid";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { ChildRenderOptionsMap } from "@/lib/ui/ObjectDescriptionList/types";
import { getSummary } from "@/models/LocalDataset/getSummary";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { type LocalDataset } from "@/models/LocalDataset/types";

type Props = {
  dataset: LocalDataset;
};

const EXCLUDED_DATASET_KEYS = ["id", "name", "data", "description"] as const;
const DATASET_RENDER_OPTIONS: ChildRenderOptionsMap<LocalDataset> = {
  fields: {
    renderAsTable: true,
    titleKey: "name",
    excludeKeys: ["id"],
  },
};

/**
 * A view of the metadata for a dataset.
 *
 * TODO(jpsyx): We should show only a preview (first 100 rows) of the data.
 * Currently, we are still showing all data, which isn't great.
 */
export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const router = useRouter();
  const [deleteLocalDataset, isDeletePending] = LocalDatasetClient.useDelete({
    queryToInvalidate: LocalDatasetClient.QueryKeys.getAll(),
  });
  const [parsedDataset, isLoadingParsedDataset] =
    LocalDatasetClient.useGetParsedLocalDataset({
      id: dataset.id,
    });

  return (
    <Container pt="lg">
      <Stack>
        <Title order={2}>{dataset.name}</Title>
        <Text>{dataset.description}</Text>

        <ObjectDescriptionList
          data={dataset}
          excludeKeys={EXCLUDED_DATASET_KEYS}
          childRenderOptions={DATASET_RENDER_OPTIONS}
        />

        <Title order={5}>Summary</Title>
        {isLoadingParsedDataset ?
          <Loader />
        : <Text>
            {
              <ObjectDescriptionList
                data={getSummary(parsedDataset)}
                childRenderOptions={{
                  columnSummaries: {
                    titleKey: "name",
                  },
                }}
              />
            }
          </Text>
        }

        <Title order={5}>Data preview</Title>
        {parsedDataset ?
          <DataGrid
            fields={
              parsedDataset.fields.map((field) => {
                return field.name;
              }) ?? []
            }
            data={parsedDataset.data ?? []}
          />
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
                deleteLocalDataset(
                  { id: dataset.id },
                  {
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
                  },
                );
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
