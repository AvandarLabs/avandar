import { LocalDatasetClient } from "@/clients/LocalDatasetClient";
import {
  UseMutateFunction,
  useMutation,
  UseMutationResult,
} from "@/lib/hooks/query/useMutation";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import {
  LocalDataset,
  LocalDatasetCreate,
  LocalDatasetId,
  LocalDatasetQueryKeys,
} from "@/models/LocalDataset";

/**
 * Get all locally stored datasets from the browser.
 * @returns A tuple of the dataset list, `isPending`, and the full `useQuery`
 * result object.
 */
export function useLocalDatasets(): UseQueryResultTuple<LocalDataset[]> {
  return useQuery({
    queryKey: LocalDatasetQueryKeys.allDatasets,
    queryFn: async () => {
      return LocalDatasetClient.getAllDatasets();
    },
  });
}

/**
 * Add a new dataset to the local (in-browser) database.
 *
 * @returns A tuple of a function to store a dataset, `isPending`, and the
 * full `useMutation` result object.
 */
export function useSaveLocalDataset(): [
  UseMutateFunction<LocalDatasetId, Error, LocalDatasetCreate>,
  boolean,
  UseMutationResult<LocalDatasetId, Error, LocalDatasetCreate>,
] {
  return useMutation({
    queryToInvalidate: LocalDatasetQueryKeys.allDatasets,
    mutationFn: async (dataset: LocalDatasetCreate) => {
      return LocalDatasetClient.addDataset(dataset);
    },
  });
}

export function useDeleteLocalDataset(): [
  UseMutateFunction<void, Error, LocalDatasetId>,
  boolean,
  UseMutationResult<void, Error, LocalDatasetId>,
] {
  return useMutation({
    queryToInvalidate: LocalDatasetQueryKeys.allDatasets,
    mutationFn: async (id: LocalDatasetId) => {
      return LocalDatasetClient.deleteDataset(id);
    },
  });
}
