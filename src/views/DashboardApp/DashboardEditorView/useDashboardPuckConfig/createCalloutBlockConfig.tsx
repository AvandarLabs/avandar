import { Paper } from "@avandar/ui";
import { msg } from "@lingui/core/macro";
import { Stack, Text } from "@mantine/core";
import type {
  AvaPageConfig,
  CalloutBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the CalloutBlock Puck configuration for the dashboard editor. */
export function createCalloutBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["CalloutBlock"] {
  return {
    label: i18n._(msg`Callout`),
    fields: {
      tone: {
        label: i18n._(msg`Tone`),
        type: "select",
        options: [
          { label: i18n._(msg`Info`), value: "info" },
          { label: i18n._(msg`Warning`), value: "warning" },
          { label: i18n._(msg`Neutral`), value: "neutral" },
        ],
      },
      title: {
        label: i18n._(msg`Title`),
        type: "text",
      },
      body: {
        label: i18n._(msg`Body`),
        type: "textarea",
      },
    },
    defaultProps: {
      body: i18n._(msg`Add context, methodology, or a key takeaway.`),
      title: i18n._(msg`Callout`),
      tone: "neutral",
    },
    render: (props: CalloutBlockProps) => {
      const borderColor: string =
        props.tone === "warning"
          ? "yellow"
          : props.tone === "info"
            ? "blue"
            : "neutral";

      return (
        <Paper withBorder p="md" style={{ borderColor }}>
          <Stack gap={6}>
            {props.title.trim().length > 0 ? (
              <Text fw={600}>{props.title}</Text>
            ) : null}
            <Text component="p">{props.body}</Text>
          </Stack>
        </Paper>
      );
    },
  };
}
