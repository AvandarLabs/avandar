import { createFileRoute, notFound } from "@tanstack/react-router";
import { DatasetMetaView } from "@/components/DataManagerApp/DatasetMetaView";
import * as LocalDataset from "@/models/LocalDataset";
import { LocalDatasetService } from "@/services/LocalDatasetService";

export const Route = createFileRoute("/_auth/data-manager/$datasetId")({
  component: RouteComponent,
  loader: async ({ params: { datasetId } }): Promise<LocalDataset.T> => {
    const dataset = await LocalDatasetService.getDataset(Number(datasetId));
    if (!dataset) {
      throw notFound();
    }
    return dataset;
  },
});

function RouteComponent() {
  const dataset = Route.useLoaderData();
  return <DatasetMetaView dataset={dataset} />;
}
