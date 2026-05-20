import { QueryClient } from "@tanstack/react-query";
import { getIsOnline } from "@/lib/offline/useIsOnline";

export const AvaQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      staleTime: () =>
        {return getIsOnline() ? 6 * 60 * 1000 : Number.POSITIVE_INFINITY},
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount: number) => {
        if (!getIsOnline()) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 0,
      networkMode: "offlineFirst",
    },
  },
});
