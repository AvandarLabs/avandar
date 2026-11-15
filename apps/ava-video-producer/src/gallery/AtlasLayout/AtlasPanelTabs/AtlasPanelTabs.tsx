import { Tabs } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { AtlasChromeProvider } from "../AtlasChromeProvider/AtlasChromeProvider";
import css from "./AtlasPanelTabs.module.css";

/** Which panel of an Atlas modal's right column is open. */
export type AtlasPanelTab = "details" | "tokens";

type Props = Readonly<{
  tab: AtlasPanelTab;
  onTabChange: (tab: AtlasPanelTab) => void;
  details: ReactNode;
  /** The Design tokens panel, or undefined when the item cannot be themed. */
  tokens?: ReactNode;
}>;

/**
 * The right column of an Atlas preview modal: Details, and Design tokens
 * when the item can be themed. The tokens panel mounts on its first visit
 * and both panels stay mounted, so a running export keeps its status.
 */
export function AtlasPanelTabs({ tab, onTabChange, details, tokens }: Props) {
  const [hasVisitedTokens, setVisitedTokens] = useState(tab === "tokens");
  if (!tokens) {
    return <>{details}</>;
  }
  return (
    <AtlasChromeProvider>
      <Tabs
        value={tab}
        onChange={(nextTab) => {
          const chosen: AtlasPanelTab =
            nextTab === "tokens" ? "tokens" : "details";
          if (chosen === "tokens") {
            setVisitedTokens(true);
          }
          onTabChange(chosen);
        }}
        classNames={{
          root: css.root,
          list: css.list,
          tab: css.tab,
          panel: css.panel,
        }}
      >
        <Tabs.List grow aria-label="Preview panels">
          <Tabs.Tab value="details">{"Details"}</Tabs.Tab>
          <Tabs.Tab value="tokens">{"Design tokens"}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="details">{details}</Tabs.Panel>
        <Tabs.Panel value="tokens">
          {hasVisitedTokens || tab === "tokens" ? tokens : null}
        </Tabs.Panel>
      </Tabs>
    </AtlasChromeProvider>
  );
}
