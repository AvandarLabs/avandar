import { Paper } from "@avandar/ui";
import { msg } from "@lingui/core/macro";
import { Stack, Text } from "@mantine/core";
import type {
  AvaPageConfig,
  CodeBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the CodeBlock Puck configuration for the dashboard editor. */
export function createCodeBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["CodeBlock"] {
  return {
    label: i18n._(msg`Code`),
    fields: {
      language: {
        label: i18n._(msg`Language`),
        type: "text",
      },
      code: {
        label: i18n._(msg`Code`),
        type: "textarea",
      },
    },
    defaultProps: {
      code: "",
      language: "",
    },
    render: (props: CodeBlockProps) => {
      const titleParts: readonly string[] = [
        props.language.trim().length > 0 ? props.language : undefined,
      ].filter((value): value is string => {
        return value !== undefined;
      });

      const title: string | undefined =
        titleParts.length > 0 ? titleParts.join("") : undefined;

      return (
        <Paper withBorder p="md">
          <Stack gap={6}>
            {title ? (
              <Text c="dimmed" fz="sm">
                {title}
              </Text>
            ) : null}
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              <code>{props.code}</code>
            </pre>
          </Stack>
        </Paper>
      );
    },
  };
}
