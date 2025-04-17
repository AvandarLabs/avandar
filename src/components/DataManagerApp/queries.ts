import {
  UseMutateFunction,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { LocalDatasetClient } from "@/clients/LocalDatasetClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import {
  LocalDataset,
  LocalDatasetCreate,
  LocalDatasetQueryKeys,
} from "@/models/LocalDataset";

/**
 * Get all locally stored datasets from the browser.
 * @returns A tuple of the dataset list, `isPending`, and the full `useQuery`
 * result object.
 */
export function useLocalDatasets(): UseQueryResultTuple<LocalDataset[]> {
  return useQuery({
    queryKey: [LocalDatasetQueryKeys.allDatasets],
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
  UseMutateFunction<number, Error, LocalDatasetCreate>,
  boolean,
  UseMutationResult<number, Error, LocalDatasetCreate>,
] {
  const queryClient = useQueryClient();
  const mutationObj = useMutation({
    mutationFn: async (dataset: LocalDatasetCreate) => {
      return LocalDatasetClient.addDataset(dataset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [LocalDatasetQueryKeys.allDatasets],
      });
    },
  });
  return [mutationObj.mutate, mutationObj.isPending, mutationObj];
}

export function useDeleteLocalDataset(): [
  UseMutateFunction<void, Error, number>,
  boolean,
  UseMutationResult<void, Error, number>,
] {
  const queryClient = useQueryClient();
  const mutationObj = useMutation({
    mutationFn: async (id: number) => {
      return LocalDatasetClient.deleteDataset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [LocalDatasetQueryKeys.allDatasets],
      });
    },
  });
  return [mutationObj.mutate, mutationObj.isPending, mutationObj];
}
