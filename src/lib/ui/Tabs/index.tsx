import {
  FloatingIndicator,
  Tabs as MantineTabs,
  TabsProps as MantineTabsProps,
  MantineTheme,
  Text,
} from "@mantine/core";
import { ReactNode, useState } from "react";
import { makeObject } from "@/lib/utils/objects/builders";

type Props<TabId extends string> = {
  /**
   * Tab labels to render.
   * This array cannot be empty.
   */
  tabIds: readonly [TabId, ...TabId[]];
  renderTabHeader:
    | {
        [K in TabId]: ((tabId: K) => ReactNode) | ReactNode;
      }
    | ((tabId: TabId) => ReactNode);
  renderTabPanel:
    | { [K in TabId]: (tabId: K) => ReactNode }
    | ((tabId: TabId) => ReactNode);
} & Omit<MantineTabsProps, "variant" | "children">;

/**
 * A wrapper around Mantine Tabs that provides a consistent interface for
 * rendering tab headers and panels with an animated floating indicator.
 */
export function Tabs<TabId extends string>({
  tabIds,
  renderTabHeader,
  renderTabPanel,
  ...props
}: Props<TabId>): JSX.Element {
  const [currentTab, setCurrentTab] = useState<TabId>(tabIds[0]!);

  // track the tab list refs so we can animate the tab indicator
  const [tabListRef, setTabListRef] = useState<HTMLDivElement | null>(null);
  const [tabItemRefs, setTabItemRefs] = useState<
    Record<TabId, HTMLButtonElement | null>
  >(() => {
    return makeObject(tabIds, { defaultValue: null });
  });
  const tabItemRefCallback = (tabItemId: TabId) => {
    return (node: HTMLButtonElement | null) => {
      tabItemRefs[tabItemId] = node; // intentional mutation
      setTabItemRefs(tabItemRefs);
    };
  };

  return (
    <MantineTabs
      variant="none"
      value={currentTab}
      onChange={(val) => {
        return setCurrentTab(val as TabId);
      }}
      {...props}
    >
      <MantineTabs.List
        mb="xs"
        ref={setTabListRef}
        pos="relative"
        style={styles.tabList}
      >
        {tabIds.map((tabId) => {
          return (
            <MantineTabs.Tab
              key={tabId}
              value={tabId}
              ref={tabItemRefCallback(tabId)}
            >
              <Text span>
                {typeof renderTabHeader === "function" ?
                  renderTabHeader(tabId)
                : typeof renderTabHeader[tabId] === "function" ?
                  renderTabHeader[tabId](tabId)
                : renderTabHeader[tabId]}
              </Text>
            </MantineTabs.Tab>
          );
        })}

        <FloatingIndicator
          target={tabItemRefs[currentTab]}
          parent={tabListRef}
          style={styles.tabIndicator}
        />
      </MantineTabs.List>

      {tabIds.map((tabId) => {
        return (
          <MantineTabs.Panel key={tabId} value={tabId}>
            {typeof renderTabPanel === "function" ?
              renderTabPanel(tabId)
            : renderTabPanel[tabId](tabId)}
          </MantineTabs.Panel>
        );
      })}
    </MantineTabs>
  );
}

const styles = {
  tabList: (theme: MantineTheme) => {
    return {
      borderBottom: `2px solid ${theme.colors.neutral[1]}`,
    };
  },
  tabIndicator: (theme: MantineTheme) => {
    return {
      position: "absolute",
      top: "2px",
      borderBottom: `2px solid ${theme.colors.primary[6]}`,
    };
  },
};
