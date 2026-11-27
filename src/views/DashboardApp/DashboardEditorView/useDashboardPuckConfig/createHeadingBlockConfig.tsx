import { msg } from "@lingui/core/macro";
import { Title } from "@mantine/core";
import type {
  AvaPageConfig,
  HeadingBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the HeadingBlock Puck configuration for the dashboard editor. */
export function createHeadingBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["HeadingBlock"] {
  return {
    label: i18n._(msg`Heading`),
    fields: {
      text: {
        label: i18n._(msg`Text`),
        type: "text",
      },
      level: {
        label: i18n._(msg`Level`),
        type: "select",
        options: [
          { label: i18n._(msg`H1`), value: 1 },
          { label: i18n._(msg`H2`), value: 2 },
          { label: i18n._(msg`H3`), value: 3 },
          { label: i18n._(msg`H4`), value: 4 },
        ],
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
      level: 2,
      text: i18n._(msg`Heading`),
    },
    render: (props: HeadingBlockProps) => {
      return (
        <Title order={props.level} ta={props.align}>
          {props.text}
        </Title>
      );
    },
  };
}
