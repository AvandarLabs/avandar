import { msg } from "@lingui/core/macro";
import { Text } from "@mantine/core";
import type {
  AvaPageConfig,
  ParagraphBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the ParagraphBlock Puck configuration for the dashboard editor. */
export function createParagraphBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["ParagraphBlock"] {
  return {
    label: i18n._(msg`Paragraph`),
    fields: {
      text: {
        label: i18n._(msg`Text`),
        type: "textarea",
      },
      align: {
        label: i18n._(msg`Align`),
        type: "radio",
        options: [
          { label: i18n._(msg`Left`), value: "left" },
          { label: i18n._(msg`Center`), value: "center" },
          { label: i18n._(msg`Right`), value: "right" },
        ],
      },
    },
    defaultProps: {
      align: "left",
      text: i18n._(msg`Write your paragraph here...`),
    },
    render: (props: ParagraphBlockProps) => {
      return (
        <Text component="p" ta={props.align}>
          {props.text}
        </Text>
      );
    },
  };
}
