import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { Logger } from "@/utils/Logger";
import { DatasetMetaView } from "@/views/DataManagerApp/DatasetMetaView/DatasetMetaView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/$datasetId",
)({
  component: RouteComponent,
  loader: async ({ params: { datasetId } }): Promise<Dataset.T> => {
    const dataset = await DatasetClient.getById({
      id: datasetId as Dataset.Id,
    });
    if (!dataset) {
      throw notFound();
    }
    return dataset;
  },
  errorComponent: DatasetMetaErrorView,
});

function RouteComponent() {
  const dataset = Route.useLoaderData();
  return <DatasetMetaView dataset={dataset} />;
}

function DatasetMetaErrorView({ error }: ErrorComponentProps) {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="50%">
      <Callout
        title={t`Dataset failed to load`}
        message={t`The dataset failed to load. Please try again later or reach out to support.`}
      />
    </Center>
  );
}
