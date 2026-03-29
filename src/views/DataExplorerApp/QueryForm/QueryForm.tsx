import { Tabs } from "@/lib/ui/Tabs";
import { LLMQueryForm } from "@/views/DataExplorerApp/QueryForm/LLMQueryForm";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm";

type Props = {
  withinPortal?: boolean;
};

export function QueryForm({ withinPortal = true }: Props): JSX.Element {
  return (
    <Tabs
      indicatorVariant="floating"
      tabIds={["llm-query", "manual-query"] as const}
      renderTabHeader={{
        "llm-query": "AI Query",
        "manual-query": "Manual Query",
      }}
      px="xs"
      py="sm"
      renderTabPanel={{
        "llm-query": () => {
          return <LLMQueryForm />;
        },
        "manual-query": () => {
          return <ManualQueryForm withinPortal={withinPortal} />;
        },
      }}
    />
  );
}
