import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { CovidDataset } from "../covid/covidWorkspace";

/** A coded line list's dataset, with the code lists a dictionary attaches. */
export type MeaslesDataset = Omit<CovidDataset, "columns"> & {
  columns: ReadonlyArray<{
    name: string;
    dataType: string;
    codes?: ColumnCodes.Context;
    /**
     * The SQL that fills a converted column from the CSV. Left out, the
     * column is the CSV's value cast to `dataType`.
     */
    sourceSql?: string;
  }>;
};

/** One code and its label, with no other spellings. */
function _createCodePair(
  code: string,
  label: string,
  isMissing = false,
): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing };
}

const CASE_ID_DESCRIPTION = "Case number assigned by the reporting county.";
const GENDER_DESCRIPTION = "Sex recorded on the case report.";
const HOSPITALIZED_DESCRIPTION =
  "Admitted to a hospital for at least one night.";

/** 9 has no label yet, as a dictionary learned from data can leave it. */
const SEX_PAIRS = [
  _createCodePair("1", "Male"),
  _createCodePair("2", "Female"),
  _createCodePair("9", ""),
];
const YES_NO_PAIRS = [_createCodePair("Y", "Yes"), _createCodePair("N", "No")];
const SES_PAIRS = [
  _createCodePair("1", "Low"),
  _createCodePair("2", "Lower-middle"),
  _createCodePair("3", "Upper-middle"),
  _createCodePair("4", "High"),
];

/**
 * The SQL a linked dataset's view decodes a column with: the app's own
 * `CASE`, through `ColumnConversion`, so the eval converts exactly as the
 * app does. The CSV holds no unmatched value, so nothing is kept.
 */
function _buildDecodeSql(
  columnName: string,
  pairs: readonly DataDictionaryCodeList.Pair[],
  isOrdered: boolean,
): string {
  return ColumnConversion.toCaseSql({
    valueSql: `"${columnName}"`,
    conversion: {
      datasetColumnId: columnName,
      direction: "decode",
      pairs,
      isOrdered,
      overrides: [],
      keepsOriginalAs: undefined,
      outputDataType: "varchar",
      inputDataType: undefined,
    },
    keptValues: [],
  });
}

/** The line list with a dictionary attached as reference. */
const CODED_LINE_LIST: MeaslesDataset = {
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
        description: CASE_ID_DESCRIPTION,
      },
    },
    {
      name: "GENDER",
      dataType: "bigint",
      codes: {
        direction: "decode",
        pairs: SEX_PAIRS,
        description: GENDER_DESCRIPTION,
      },
    },
    {
      name: "hosp_yn",
      dataType: "varchar",
      codes: {
        direction: "decode",
        pairs: YES_NO_PAIRS,
        description: HOSPITALIZED_DESCRIPTION,
      },
    },
    {
      name: "ses_cat",
      dataType: "bigint",
      codes: { direction: "decode", pairs: SES_PAIRS },
    },
    { name: "onset_dt", dataType: "date" },
    { name: "county", dataType: "varchar" },
  ],
};

/**
 * The line list's linked dataset: the same rows with GENDER, hosp_yn, and
 * ses_cat converted to labels. Each converted column's codes say it holds
 * labels (`encode`), as the app's loaders describe a converted column.
 */
const LABELED_LINE_LIST: MeaslesDataset = {
  id: "8c4e2f1a-3b7d-4e9a-a6c5-1d2f3e4a5b6c",
  name: "measles-line-list-small (labeled)",
  fileName: "measles-line-list-small.csv",
  truthViewName: "labeled_line_list",
  columns: [
    {
      name: "case_id",
      dataType: "varchar",
      codes: {
        direction: "decode",
        pairs: [],
        description: CASE_ID_DESCRIPTION,
      },
    },
    {
      name: "GENDER",
      dataType: "varchar",
      sourceSql: _buildDecodeSql("GENDER", SEX_PAIRS, false),
      codes: {
        direction: "encode",
        pairs: SEX_PAIRS,
        description: GENDER_DESCRIPTION,
      },
    },
    {
      name: "hosp_yn",
      dataType: "varchar",
      sourceSql: _buildDecodeSql("hosp_yn", YES_NO_PAIRS, false),
      codes: {
        direction: "encode",
        pairs: YES_NO_PAIRS,
        description: HOSPITALIZED_DESCRIPTION,
      },
    },
    {
      name: "ses_cat",
      dataType: "varchar",
      sourceSql: _buildDecodeSql("ses_cat", SES_PAIRS, true),
      codes: { direction: "encode", pairs: SES_PAIRS },
    },
    { name: "onset_dt", dataType: "date" },
    { name: "county", dataType: "varchar" },
  ],
};

/**
 * The coded-columns workspace: the 24-row measles line list the e2e tests
 * import, with a dictionary attached as reference, and its linked dataset
 * converted to labels.
 */
export const MEASLES_DATASETS: readonly MeaslesDataset[] = [
  CODED_LINE_LIST,
  LABELED_LINE_LIST,
];
