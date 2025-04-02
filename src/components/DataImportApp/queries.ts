import {
  UseMutateFunction,
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import * as LocalDataset from "@/models/LocalDataset";
import { LocalDatasetService } from "@/services/LocalDatasetService";

/**
 * Get all locally stored datasets from the browser.
 * @returns A tuple of the dataset list, `isPending`, and the full `useQuery`
 * result object.
 */
export function useGetAllLocalDatasets(): [
  LocalDataset.T[] | undefined,
  boolean,
  UseQueryResult<LocalDataset.T[]>,
] {
  const queryResultObj = useQuery({
    queryKey: [LocalDataset.QueryKeys.allDatasets],
    queryFn: async () => {
      return LocalDatasetService.getAllDatasets();
    },
  });
  return [queryResultObj.data, queryResultObj.isLoading, queryResultObj];
}

/**
 * Add a new dataset to the local (in-browser) database.
 *
 * @returns A tuple of a function to store a dataset, `isPending`, and the
 * full `useMutation` result object.
 */
export function useSaveLocalDataset(): [
  UseMutateFunction<string, Error, LocalDataset.T>,
  boolean,
  UseMutationResult<string, Error, LocalDataset.T>,
] {
  const queryClient = useQueryClient();
  const mutationObj = useMutation({
    mutationFn: async (dataset: LocalDataset.T) => {
      return LocalDatasetService.addDataset(dataset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [LocalDataset.QueryKeys.allDatasets],
      });
    },
  });
  return [mutationObj.mutate, mutationObj.isPending, mutationObj];
}

export function useDeleteLocalDataset(): [
  UseMutateFunction<void, Error, string>,
  boolean,
  UseMutationResult<void, Error, string>,
] {
  const queryClient = useQueryClient();
  const mutationObj = useMutation({
    mutationFn: async (id: string) => {
      return LocalDatasetService.deleteDataset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [LocalDataset.QueryKeys.allDatasets],
      });
    },
  });
  return [mutationObj.mutate, mutationObj.isPending, mutationObj];
}
