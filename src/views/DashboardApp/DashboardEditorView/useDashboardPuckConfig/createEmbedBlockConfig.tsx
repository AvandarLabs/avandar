import { Paper } from "@avandar/ui";
import { msg } from "@lingui/core/macro";
import { Text } from "@mantine/core";
import {
  getEmbedUrlFromValue,
  getIframeHeightFromValue,
} from "./DashboardConfigHelpers";
import type {
  AvaPageConfig,
  EmbedBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the EmbedBlock Puck configuration for the dashboard editor. */
export function createEmbedBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["EmbedBlock"] {
  return {
    label: i18n._(msg`Embed`),
    fields: {
      title: {
        label: i18n._(msg`Title`),
        type: "text",
      },
      url: {
        label: i18n._(msg`URL`),
        type: "text",
      },
      height: {
        label: i18n._(msg`Height`),
        type: "number",
        min: 200,
        max: 1200,
        step: 10,
      },
    },
    defaultProps: {
      height: 480,
      title: "",
      url: "",
    },
    render: (props: EmbedBlockProps) => {
      const url: string | undefined = getEmbedUrlFromValue(props.url);

      if (!url) {
        return (
          <Text c="dimmed" fz="sm">
            {i18n._(
              msg`Add a URL to embed a visualization or external content.`,
            )}
          </Text>
        );
      }

      return (
        <Paper withBorder p={0} radius="sm">
          <iframe
            src={url}
            title={
              props.title.trim().length > 0 ? props.title : i18n._(msg`Embed`)
            }
            loading="lazy"
            sandbox="allow-scripts allow-presentation"
            style={{
              border: 0,
              height: getIframeHeightFromValue(props.height),
              width: "100%",
            }}
            allow="fullscreen"
          />
        </Paper>
      );
    },
  };
}
