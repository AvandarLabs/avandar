import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable testResults editor. */
export const TEST_RESULTS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.grievance-remedy-retest.controls.testResults.help",
    message:
      "Supply what the object's two tests visibly demonstrate. Before is always not-functioning; after is explicitly authored; not-tested prevents the second operation.",
  },
  path: "testResults",
  kind: "object",
  controls: [
    {
      path: "before",
      kind: "select",
      options: [
        {
          value: "not-functioning",
          label: {
            id: "motionAtlas.grievance-remedy-retest.controls.testResults.before.0",
            message: "not-functioning",
          },
        },
      ],
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.testResults.before",
        message: "before",
      },
    },
    {
      path: "after",
      kind: "select",
      options: [
        {
          value: "functioning",
          label: {
            id: "motionAtlas.grievance-remedy-retest.controls.testResults.after.0",
            message: "functioning",
          },
        },
        {
          value: "not-functioning",
          label: {
            id: "motionAtlas.grievance-remedy-retest.controls.testResults.after.1",
            message: "not-functioning",
          },
        },
        {
          value: "not-tested",
          label: {
            id: "motionAtlas.grievance-remedy-retest.controls.testResults.after.2",
            message: "not-tested",
          },
        },
      ],
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.testResults.after",
        message: "after",
      },
    },
  ],
  label: {
    id: "motionAtlas.grievance-remedy-retest.controls.testResults",
    message: "testResults",
  },
};
