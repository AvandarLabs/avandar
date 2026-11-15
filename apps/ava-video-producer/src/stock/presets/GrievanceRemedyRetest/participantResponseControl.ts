import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable participantResponse editor. */
export const PARTICIPANT_RESPONSE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.grievance-remedy-retest.controls.participantResponse.help",
    message:
      "Set the participant's reported response separately from the technical test. One of the listed values; accepted is allowed only after functioning; a functioning test may still be not-accepted or pending.",
  },
  path: "participantResponse",
  kind: "select",
  options: [
    {
      value: "accepted",
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.participantResponse.0",
        message: "accepted",
      },
    },
    {
      value: "not-accepted",
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.participantResponse.1",
        message: "not-accepted",
      },
    },
    {
      value: "pending",
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.participantResponse.2",
        message: "pending",
      },
    },
  ],
  label: {
    id: "motionAtlas.grievance-remedy-retest.controls.participantResponse",
    message: "participantResponse",
  },
};
