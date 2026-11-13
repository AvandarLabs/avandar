import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { CovidDataset } from "../covid/covidWorkspace";

/** A coded line list's dataset, with the code lists a dictionary attaches. */
export type MeaslesDataset = Omit<CovidDataset, "columns"> & {
  columns: ReadonlyArray<{
    name: string;
    dataType: string;
    codes?: ColumnCodes.Context;
  }>;
};

function _pair(
  code: string,
  label: string,
  isMissing = false,
): ColumnCodes.Pair {
  return { code, label, acceptedSpellings: [], isMissing };
}

/**
 * The coded-columns workspace: the 24-row measles line list the e2e tests
 * import, with a dictionary attached as reference. GENDER's code 9 has no
 * label yet, as a dictionary learned from data can leave it.
 */
export const MEASLES_DATASETS: readonly MeaslesDataset[] = [
  {
    id: "5e1b7c2a-8d4f-4a6e-9b3c-2f7d1e0a4c58",
    name: "measles-line-list-small.csv",
    fileName: "measles-line-list-small.csv",
    truthViewName: "line_list",
    columns: [
      {
        name: "case_id",
        dataType: "varchar",
        codes: {
          direction: "decode",
          pairs: [],
          description: "Case number assigned by the reporting county.",
        },
      },
      {
        name: "GENDER",
        dataType: "bigint",
        codes: {
          direction: "decode",
          pairs: [_pair("1", "Male"), _pair("2", "Female"), _pair("9", "")],
          description: "Sex recorded on the case report.",
        },
      },
      {
        name: "hosp_yn",
        dataType: "varchar",
        codes: {
          direction: "decode",
          pairs: [_pair("Y", "Yes"), _pair("N", "No")],
          description: "Admitted to a hospital for at least one night.",
        },
      },
      {
        name: "ses_cat",
        dataType: "bigint",
        codes: {
          direction: "decode",
          pairs: [
            _pair("1", "Low"),
            _pair("2", "Lower-middle"),
            _pair("3", "Upper-middle"),
            _pair("4", "High"),
          ],
        },
      },
      { name: "onset_dt", dataType: "date" },
      { name: "county", dataType: "varchar" },
    ],
  },
];
