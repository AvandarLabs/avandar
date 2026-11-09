import { definePlugin } from "@avandar/plugin-sdk";
import { RegressionModal } from "./RegressionModal/RegressionModal";

// A plugin entry exports its definition, not a component, so there is nothing
// for fast refresh to track.
// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  commands: {
    "regression.linear": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
  },
});
