import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable tallyArrangement editor. */
export const TALLY_ARRANGEMENT_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.resident-budget-ballots.controls.tallyArrangement.help",
    message:
      "Choose the arrangement of unfolded paper ballots. Stacks or rows; both retain one visible unit per ballot.",
  },
  path: "tallyArrangement",
  kind: "select",
  options: [
    {
      value: "stacks",
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.tallyArrangement.0",
        message: "stacks",
      },
    },
    {
      value: "rows",
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.tallyArrangement.1",
        message: "rows",
      },
    },
  ],
  label: {
    id: "motionAtlas.resident-budget-ballots.controls.tallyArrangement",
    message: "tallyArrangement",
  },
};
