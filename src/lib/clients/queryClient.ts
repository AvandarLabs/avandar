import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

// Keep draft queries around for the whole tab session
queryClient.setQueryDefaults(["data-explorer", "draft"], { gcTime: Infinity });
