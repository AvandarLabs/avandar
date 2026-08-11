import { makeObject } from "@avandar/utils";
import {
  FloatingIndicator,
  Tabs as MantineTabs,
  TabsProps as MantineTabsProps,
  Text,
} from "@mantine/core";
import clsx from "clsx";
import { ReactNode, useState } from "react";
import classes from "./Tabs.module.css";

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

  /**
   * Controlled active tab id. When provided together with `onTabChange`,
   * the parent owns selection state (used when the tab is mirrored to the
   * URL so it can survive a refresh).
   */
  value?: TabId;

  /**
   * Fires when the user activates a different tab. Required only when
   * `value` is provided.
   */
  onTabChange?: (tabId: TabId) => void;

  /**
   * When this value changes, the floating indicator remounts and remeasures
   * against the active tab (e.g. after a parent modal open animation).
   */
  indicatorRemountKey?: number;

  /**
   * Content rendered on the trailing edge of the tab list row, beside the
   * tabs. For hosts whose tab strip doubles as a toolbar, such as a drawer
   * rail that carries controls scoped to the active tab.
   */
  listRightSection?: ReactNode;
} & Omit<MantineTabsProps, "variant" | "children" | "value" | "onChange">;

/**
 * A wrapper around Mantine Tabs that provides a consistent interface for
 * rendering tab headers and panels with an animated floating indicator.
 */
export function Tabs<TabId extends string>({
  tabIds,
  renderTabHeader,
  renderTabPanel,
  indicatorVariant = "floating",
  value,
  onTabChange,
  indicatorRemountKey = 0,
  listRightSection,
  classNames: tabsClassNames,
  ...props
}: Props<TabId>): JSX.Element {
  const tabsClassNamesObj =
    typeof tabsClassNames === "function" ? undefined : tabsClassNames;
  const [internalTab, setInternalTab] = useState<TabId>(tabIds[0]!);
  const isControlled = value !== undefined;
  const currentTab = isControlled ? value : internalTab;

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
      classNames={tabsClassNames}
      value={currentTab}
      onChange={(val) => {
        const next = val as TabId;
        if (isControlled) {
          onTabChange?.(next);
        } else {
          setInternalTab(next);
          onTabChange?.(next);
        }
      }}
      {...props}
    >
      <MantineTabs.List
        mb={isFloating ? undefined : "xs"}
        ref={setTabListRef}
        pos="relative"
        className={clsx(
          isFloating && classes.list,
          listRightSection !== undefined && classes.listWithRightSection,
          tabsClassNamesObj?.list,
        )}
        style={
          isFloating ? undefined : (
            {
              borderBottom: "2px solid var(--mantine-color-neutral-1)",
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
              <Text span fw={isActive ? 500 : 400}>
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
          key={indicatorRemountKey}
          target={tabItemRefs[currentTab]}
          parent={tabListRef}
          className={isFloating ? classes.indicator : undefined}
          style={
            isFloating ? undefined : (
              {
                position: "absolute",
                top: "2px",
                borderBottom: "2px solid var(--mantine-color-primary-6)",
              }
            )
          }
        />

        {listRightSection !== undefined ?
          <div className={classes.listRightSection}>{listRightSection}</div>
        : null}
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
