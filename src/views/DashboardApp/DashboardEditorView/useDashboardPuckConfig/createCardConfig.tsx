import { Paper } from "@avandar/ui";
import { msg } from "@lingui/core/macro";
import { Stack, Text } from "@mantine/core";
import { renderSlot } from "./DashboardConfigHelpers";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the Card Puck configuration for the dashboard editor. */
export function createCardConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["Card"] {
  return {
    label: i18n._(msg`Card`),
    fields: {
      title: {
        label: i18n._(msg`Title`),
        type: "text",
      },
      content: {
        label: i18n._(msg`Content`),
        type: "slot",
        disallow: ["Card"],
      },
    },
    defaultProps: {
      content: [],
      title: i18n._(msg`Card`),
    },
    render: (props) => {
      return (
        <Paper p="md">
          <Stack gap="sm">
            {props.title.trim().length > 0 ? (
              <Text fw={600}>{props.title}</Text>
            ) : null}
            {renderSlot(props.content)}
          </Stack>
        </Paper>
      );
    },
  };
}
