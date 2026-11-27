import { msg } from "@lingui/core/macro";
import { Image, Stack, Text } from "@mantine/core";
import type {
  AvaPageConfig,
  FigureBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the FigureBlock Puck configuration for the dashboard editor. */
export function createFigureBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["FigureBlock"] {
  return {
    label: i18n._(msg`Image`),
    fields: {
      src: {
        label: i18n._(msg`Image URL`),
        type: "text",
      },
      alt: {
        label: i18n._(msg`Alt text`),
        type: "text",
      },
      caption: {
        label: i18n._(msg`Caption`),
        type: "textarea",
      },
    },
    defaultProps: {
      alt: "",
      caption: "",
      src: "",
    },
    render: (props: FigureBlockProps) => {
      return (
        <Stack gap={6}>
          {props.src.trim().length > 0 ? (
            <Image src={props.src} alt={props.alt} radius="sm" />
          ) : (
            <Text c="dimmed" fz="sm">
              {i18n._(msg`Add an image URL to render a figure.`)}
            </Text>
          )}
          {props.caption.trim().length > 0 ? (
            <Text c="dimmed" fz="sm">
              {props.caption}
            </Text>
          ) : null}
        </Stack>
      );
    },
  };
}
