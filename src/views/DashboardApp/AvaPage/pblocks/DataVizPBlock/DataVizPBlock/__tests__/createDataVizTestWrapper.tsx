import { QueryClientProvider } from "@tanstack/react-query";
import { TestProviders } from "@/test-utils";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Props = { children: ReactNode };
/**
 * Creates a `renderHook` wrapper that provides the given query client and the
 * app's test providers. Used only by the `DataVizPBlock` test that renders
 * `useDataVizPBlockConfig` to check its `resolveData`.
 */
export function createDataVizTestWrapper(
  client: QueryClient,
): (props: Readonly<Props>) => ReactNode {
  return ({ children }: Readonly<Props>): ReactNode => {
    return (
      <QueryClientProvider client={client}>
        <TestProviders>{children}</TestProviders>
      </QueryClientProvider>
    );
  };
}
