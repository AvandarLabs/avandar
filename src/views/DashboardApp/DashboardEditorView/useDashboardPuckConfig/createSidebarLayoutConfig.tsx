import { msg } from "@lingui/core/macro";
import { Box, Stack } from "@mantine/core";
import {
  buildGridTemplateColumnsFromCount,
  clampSpan,
  getSpacingFromValue,
  renderSlot,
} from "./DashboardConfigHelpers";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the SidebarLayout Puck configuration for the dashboard editor. */
export function createSidebarLayoutConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["SidebarLayout"] {
  return {
    label: i18n._(msg`Sidebar layout`),
    fields: {
      sidebarPosition: {
        label: i18n._(msg`Sidebar position`),
        type: "radio",
        options: [
          { label: i18n._(msg`Left`), value: "left" },
          { label: i18n._(msg`Right`), value: "right" },
        ],
      },
      sidebarSpan: {
        label: i18n._(msg`Sidebar span`),
        type: "number",
        min: 2,
        max: 10,
        step: 1,
      },
      gap: {
        label: i18n._(msg`Gap`),
        type: "select",
        options: [
          { label: i18n._(msg`Extra small`), value: "xs" },
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
        ],
      },
      collapseAt: {
        label: i18n._(msg`Collapse at`),
        type: "select",
        options: [
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
        ],
      },
      sidebar: {
        label: i18n._(msg`Sidebar`),
        type: "slot",
      },
      main: {
        label: i18n._(msg`Main`),
        type: "slot",
      },
    },
    defaultProps: {
      collapseAt: "md",
      gap: "lg",
      main: [],
      sidebar: [],
      sidebarPosition: "right",
      sidebarSpan: 4,
    },
    render: (props) => {
      const sidebarSpan: number = clampSpan(props.sidebarSpan);
      const mainSpan: number = 12 - sidebarSpan;
      const gap: string = getSpacingFromValue(props.gap);

      const first:
        | { content: unknown; key: "sidebar" | "main" }
        | { content: unknown; key: "sidebar" | "main" } =
        props.sidebarPosition === "left"
          ? { key: "sidebar", content: props.sidebar }
          : { key: "main", content: props.main };

      const second:
        | { content: unknown; key: "sidebar" | "main" }
        | { content: unknown; key: "sidebar" | "main" } =
        props.sidebarPosition === "left"
          ? { key: "main", content: props.main }
          : { key: "sidebar", content: props.sidebar };

      return (
        <>
          <Box
            display="grid"
            style={{
              gap,
              gridTemplateColumns:
                props.sidebarPosition === "left"
                  ? buildGridTemplateColumnsFromCount({
                      leftSpan: sidebarSpan,
                      rightSpan: mainSpan,
                    })
                  : buildGridTemplateColumnsFromCount({
                      leftSpan: mainSpan,
                      rightSpan: sidebarSpan,
                    }),
            }}
            visibleFrom={props.collapseAt}
          >
            <Stack gap="md">{renderSlot(first.content)}</Stack>
            <Stack gap="md">{renderSlot(second.content)}</Stack>
          </Box>

          <Stack gap="md" hiddenFrom={props.collapseAt}>
            {renderSlot(props.main)}
            {renderSlot(props.sidebar)}
          </Stack>
        </>
      );
    },
  };
}
