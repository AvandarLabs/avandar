import { msg } from "@lingui/core/macro";
import { Divider } from "@mantine/core";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the DividerBlock Puck configuration for the dashboard editor. */
export function createDividerBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["DividerBlock"] {
  return {
    label: i18n._(msg`Divider`),
    fields: {},
    render: () => {
      return <Divider />;
    },
  };
}
