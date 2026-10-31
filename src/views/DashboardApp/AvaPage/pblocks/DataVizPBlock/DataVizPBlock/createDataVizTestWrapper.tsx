import { QueryClientProvider } from "@tanstack/react-query";
import { TestProviders } from "@/test-utils";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Props = { children: ReactNode };
/** Creates the providers for a dashboard field-editing test. */
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
