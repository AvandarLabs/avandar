import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NewDictionaryFromDatasetsView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFromDatasetsView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/dictionaries/new",
)({
  component: RouteComponent,
  validateSearch: z.object({
    fromDatasetId: z.uuid().optional().catch(undefined),
  }),
});

function RouteComponent(): ReactNode {
  const { fromDatasetId } = Route.useSearch();
  // The router's search typing drops the id's brand, so restore it. A new
  // key starts the flow over when the route opens from another dataset.
  const originDatasetId = fromDatasetId as Dataset.Id | undefined;
  return (
    <NewDictionaryFromDatasetsView
      key={fromDatasetId ?? "datasets"}
      originDatasetId={originDatasetId}
    />
  );
}
