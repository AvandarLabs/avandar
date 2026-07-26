import { useLingui } from "@lingui/react/macro";
import { Tabs } from "@ui";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import { SqlQueryView } from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView";
import css from "./QueryDetailsBody.module.css";
import type { ReactNode } from "react";

/**
 * Body of the "Query Details" floating window. Lets the user inspect or edit
 * the current query in two ways: a structured form (Manual) and the raw SQL
 * (SQL). Both tabs read and write through `DataExplorerStateManager` so they
 * stay in sync with the canvas and with whichever AI prompt produced the SQL.
 */
export function QueryDetailsBody(): ReactNode {
  const { t } = useLingui();
  return (
    <Tabs
      indicatorVariant="floating"
      tabIds={["manual-query", "sql"] as const}
      renderTabHeader={{
        "manual-query": t`Manual Query`,
        sql: "SQL",
      }}
      px="xs"
      pt="xs"
      pb="sm"
      classNames={{ list: css.tabList }}
      renderTabPanel={{
        "manual-query": () => {
          return <ManualQueryForm withinPortal />;
        },
        sql: () => {
          return <SqlQueryView />;
        },
      }}
    />
  );
}
