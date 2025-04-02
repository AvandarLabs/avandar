import { createFileRoute } from "@tanstack/react-router";
import * as LocalDataset from "@/models/LocalDataset";
import { LocalDatasetService } from "@/services/LocalDatasetService";

export const Route = createFileRoute("/_auth/data-manager/$datasetId")({
  component: RouteComponent,
  loader: ({ params: { datasetId } }) => {
    return LocalDatasetService.getDataset(datasetId);
  },
});

function RouteComponent({ dataset }: { dataset: LocalDataset.T }) {
  return <div>Hello "/_auth/data-manager/$datasetId"!</div>;
}
