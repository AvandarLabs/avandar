import type { DevDuckDbTable } from "@/components/spotlight-modals/DevDuckDbTableSchemaView/DevDuckDbTableSchemaView";
import type { ReactNode } from "react";

import { ObjectDescriptionList } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";

type Props = {
  tables: readonly DevDuckDbTable[] | undefined;
  isLoading: boolean;
};

/** The loading, empty and populated states of the DuckDB schema list. */
export function DuckDbTablesContent({
  tables,
  isLoading,
}: Readonly<Props>): ReactNode {
  if (isLoading) {
    return <Loader />;
  }
  if (!tables || tables.length === 0) {
    return (
      <Text>
        <Trans>No tables found</Trans>
      </Text>
    );
  }
  return (
    <ObjectDescriptionList<DevDuckDbTable[]>
      data={[...tables]}
      defaultExpanded={true}
      titleKey="tableName"
      renderUndefinedString="undefined"
      renderNullString="null"
      itemRenderOptions={{
        keyRenderOptions: {
          schema: {
            renderAsTable: true,
            itemRenderOptions: { renderObjectKeyTransform: "none" },
          },
        },
      }}
    />
  );
}
