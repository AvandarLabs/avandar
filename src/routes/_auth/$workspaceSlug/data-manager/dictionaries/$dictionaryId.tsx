import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { Logger } from "@/utils/Logger";
import { DataDictionaryView } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryView";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/dictionaries/$dictionaryId",
)({
  component: RouteComponent,
  // The loader only turns a missing or unreadable dictionary into a 404.
  // The view reads the dictionary through its query so edits show live.
  loader: async ({ params: { dictionaryId } }): Promise<DataDictionary.Id> => {
    const dictionary = await DataDictionaryClient.getById({
      id: dictionaryId as DataDictionary.Id,
    });
    if (!dictionary) {
      throw notFound();
    }
    return dictionary.id;
  },
  errorComponent: DataDictionaryErrorView,
});

function RouteComponent(): ReactNode {
  // The router's loader typing flattens a branded id, so restore the brand.
  const dictionaryId = Route.useLoaderData() as DataDictionary.Id;
  return <DataDictionaryView dictionaryId={dictionaryId} />;
}

function DataDictionaryErrorView({ error }: ErrorComponentProps): ReactNode {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center flex={1} p="lg">
      <Callout
        maw={520}
        title={t`Dictionary failed to load`}
        message={t`The dictionary failed to load. Please try again later or reach out to support.`}
      />
    </Center>
  );
}
