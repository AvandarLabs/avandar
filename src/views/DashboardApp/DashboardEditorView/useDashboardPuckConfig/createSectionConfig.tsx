import { msg } from "@lingui/core/macro";
import { Box, Stack } from "@mantine/core";
import { getMaxWidthFromValue, renderSlot } from "./DashboardConfigHelpers";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the Section Puck configuration for the dashboard editor. */
export function createSectionConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["Section"] {
  return {
    label: i18n._(msg`Section`),
    fields: {
      maxWidth: {
        label: i18n._(msg`Max width`),
        type: "select",
        options: [
          { label: i18n._(msg`Narrow`), value: "narrow" },
          { label: i18n._(msg`Normal`), value: "normal" },
          { label: i18n._(msg`Wide`), value: "wide" },
          { label: i18n._(msg`Full`), value: "full" },
        ],
      },
      padding: {
        label: i18n._(msg`Padding`),
        type: "select",
        options: [
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
        ],
      },
      background: {
        label: i18n._(msg`Background`),
        type: "select",
        options: [
          { label: i18n._(msg`None`), value: "none" },
          { label: i18n._(msg`Subtle`), value: "subtle" },
        ],
      },
      content: {
        label: i18n._(msg`Content`),
        type: "slot",
      },
    },
    defaultProps: {
      background: "none",
      content: [],
      maxWidth: "normal",
      padding: "md",
    },
    render: (props) => {
      const maxWidth: number | string = getMaxWidthFromValue(props.maxWidth);
      return (
        <Box
          mx="auto"
          maw={maxWidth}
          py={props.padding}
          px="md"
          bg={props.background === "subtle" ? "neutral.0" : undefined}
        >
          <Stack gap="md">{renderSlot(props.content)}</Stack>
        </Box>
      );
    },
  };
}
