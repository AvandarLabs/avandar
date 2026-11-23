import { msg } from "@lingui/core/macro";
import { Blockquote, Text } from "@mantine/core";
import type {
  AvaPageConfig,
  QuoteBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the QuoteBlock Puck configuration for the dashboard editor. */
export function createQuoteBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["QuoteBlock"] {
  return {
    label: i18n._(msg`Quote`),
    fields: {
      quote: {
        label: i18n._(msg`Quote`),
        type: "textarea",
      },
      cite: {
        label: i18n._(msg`Attribution`),
        type: "text",
      },
    },
    defaultProps: {
      cite: "",
      quote: i18n._(msg`Add a pull quote...`),
    },
    render: (props: QuoteBlockProps) => {
      return (
        <Blockquote cite={props.cite}>
          <Text component="p">{props.quote}</Text>
        </Blockquote>
      );
    },
  };
}
