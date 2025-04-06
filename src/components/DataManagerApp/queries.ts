import {
  UseMutateFunction,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useQuery, UseQueryResult } from "@/hooks/api/useQuery";
import * as LocalDataset from "@/models/LocalDataset";
import { LocalDatasetService } from "@/services/LocalDatasetService";

/**
 * Get all locally stored datasets from the browser.
 * @returns A tuple of the dataset list, `isPending`, and the full `useQuery`
 * result object.
 */
export function useLocalDatasets(): [
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
  UseMutateFunction<number, Error, LocalDataset.CreateT>,
  boolean,
  UseMutationResult<number, Error, LocalDataset.CreateT>,
] {
  const queryClient = useQueryClient();
  const mutationObj = useMutation({
    mutationFn: async (dataset: LocalDataset.CreateT) => {
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
  UseMutateFunction<void, Error, number>,
  boolean,
  UseMutationResult<void, Error, number>,
] {
  const queryClient = useQueryClient();
  const mutationObj = useMutation({
    mutationFn: async (id: number) => {
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
