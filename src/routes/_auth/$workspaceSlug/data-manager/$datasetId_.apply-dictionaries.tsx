import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ApplyDictionariesView } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesView";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

// `$datasetId_` keeps this route out of the dataset view's subtree: the
// dataset view is a leaf with no outlet.
export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/$datasetId_/apply-dictionaries",
)({
  component: RouteComponent,
  validateSearch: z.object({
    dictionaryId: z.uuid().optional().catch(undefined),
  }),
});

function RouteComponent(): ReactNode {
  const { datasetId } = Route.useParams();
  const { dictionaryId } = Route.useSearch();
  // The router's typing drops the ids' brands, so restore them. A new key
  // starts the flow over for another dataset or dictionary.
  return (
    <ApplyDictionariesView
      key={`${datasetId}:${dictionaryId ?? ""}`}
      datasetId={datasetId as Dataset.Id}
      preselectedDictionaryId={dictionaryId as DataDictionary.Id | undefined}
    />
  );
}
