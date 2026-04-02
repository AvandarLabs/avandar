import {
  FloatingIndicator,
  Tabs as MantineTabs,
  TabsProps as MantineTabsProps,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { makeObject } from "@utils/objects/makeObject/makeObject";
import { ReactNode, useState } from "react";
import classes from "@/lib/ui/Tabs/Tabs.module.css";

export type TabsIndicatorVariant = "underline" | "floating";

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

  /**
   * Visual style for the `FloatingIndicator` behind the active tab.
   * - `underline`: bottom border on the list + accent line under the tab.
   * - `floating`: pill background, border, and shadow (Mantine demo style).
   */
  indicatorVariant?: TabsIndicatorVariant;
} & Omit<MantineTabsProps, "variant" | "children">;

/**
 * A wrapper around Mantine Tabs that provides a consistent interface for
 * rendering tab headers and panels with an animated floating indicator.
 */
export function Tabs<TabId extends string>({
  tabIds,
  renderTabHeader,
  renderTabPanel,
  indicatorVariant = "underline",
  ...props
}: Props<TabId>): JSX.Element {
  const theme = useMantineTheme();
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

  const isFloating = indicatorVariant === "floating";

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
        mb={isFloating ? undefined : "xs"}
        ref={setTabListRef}
        pos="relative"
        className={isFloating ? classes.list : undefined}
        style={
          isFloating ? undefined : (
            {
              borderBottom: `2px solid ${theme.colors.neutral[1]}`,
            }
          )
        }
      >
        {tabIds.map((tabId) => {
          const isActive = currentTab === tabId;
          return (
            <MantineTabs.Tab
              key={tabId}
              value={tabId}
              ref={tabItemRefCallback(tabId)}
              className={isFloating ? classes.tab : undefined}
            >
              <Text
                span
                fw={isActive ? 500 : 400}
                c={!isActive ? "dimmed" : undefined}
              >
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
          className={isFloating ? classes.indicator : undefined}
          style={
            isFloating ? undefined : (
              {
                position: "absolute",
                top: "2px",
                borderBottom: `2px solid ${theme.colors.primary[6]}`,
              }
            )
          }
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
