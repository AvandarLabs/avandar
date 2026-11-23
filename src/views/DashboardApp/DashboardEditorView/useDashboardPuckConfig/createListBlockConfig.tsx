import { msg } from "@lingui/core/macro";
import { List } from "@mantine/core";
import type {
  AvaPageConfig,
  ListBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the ListBlock Puck configuration for the dashboard editor. */
export function createListBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["ListBlock"] {
  return {
    label: i18n._(msg`List`),
    fields: {
      type: {
        label: i18n._(msg`Type`),
        type: "radio",
        options: [
          { label: i18n._(msg`Unordered`), value: "unordered" },
          { label: i18n._(msg`Ordered`), value: "ordered" },
        ],
      },
      items: {
        label: i18n._(msg`Items`),
        type: "array",
        arrayFields: {
          text: {
            label: i18n._(msg`Text`),
            type: "text",
          },
        },
        getItemSummary: (item) => {
          const text: unknown = (item as { text?: unknown }).text;

          return typeof text === "string" && text.trim().length > 0
            ? text
            : i18n._(msg`List item`);
        },
      },
    },
    defaultProps: {
      items: [
        { text: i18n._(msg`First point`) },
        { text: i18n._(msg`Second point`) },
      ],
      type: "unordered",
    },
    render: (props: ListBlockProps) => {
      return (
        <List type={props.type === "ordered" ? "ordered" : "unordered"}>
          {props.items.map((item, idx) => {
            return <List.Item key={idx}>{item.text}</List.Item>;
          })}
        </List>
      );
    },
  };
}
