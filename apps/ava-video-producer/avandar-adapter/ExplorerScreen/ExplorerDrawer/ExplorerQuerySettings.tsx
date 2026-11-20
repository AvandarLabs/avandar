import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import type { ExplorerDrawerProps } from "./ExplorerDrawer.types";
import type { ReactNode } from "react";

type Props = Pick<ExplorerDrawerProps, "stage" | "manualGroups" | "sqlEditor">;

/** SQL and manual query groups remain the product's native settings layouts. */
export function ExplorerQuerySettings({
  stage,
  manualGroups,
  sqlEditor,
}: Readonly<Props>): ReactNode {
  return stage.isSql ? (
    <SettingsColumns
      layout="columns"
      minColumnWidth={320}
      groups={[{ id: "sql", title: "SQL", content: sqlEditor }]}
    />
  ) : (
    <SettingsColumns groups={manualGroups} layout="columns" />
  );
}
