import { definePlugin } from "@avandar/plugin-sdk";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { IncidenceModal } from "./incidence/IncidenceModal/IncidenceModal";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";
import { RegressionModal } from "./RegressionModal/RegressionModal";
import { RollingAverageModal } from "./rollingAverage/RollingAverageModal/RollingAverageModal";

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
    "incidence.rate": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("incidence.title"),
        content: <IncidenceModal />,
      });
    },
    "rolling.average": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("rollingAverage.title"),
        content: <RollingAverageModal />,
      });
    },
  },
  vizTypes: {
    epicurve: { transform: makeEpicurveFromRows },
    "rate-plot": { Component: RatePlot },
  },
});
