/**
 * The COVID workspace the AI harness eval asks questions about: the three
 * JHU CSSE long-format files, imported with their default names, exactly as
 * the app stores their schema (copied from a local import of the files).
 */

/** One dataset as the chat sees it, plus where its rows come from. */
export type CovidDataset = {
  id: string;
  name: string;
  /** File name under the eval data directory (`~/cleaned-test-data`). */
  fileName: string;
  /** Short view name the ground-truth SQL uses. */
  truthViewName: string;
  columns: ReadonlyArray<{ name: string; dataType: string }>;
};

const US_COLUMNS_BEFORE_POPULATION = [
  { name: "Province_State", dataType: "varchar" },
  { name: "Admin2", dataType: "varchar" },
  { name: "UID", dataType: "bigint" },
  { name: "iso2", dataType: "varchar" },
  { name: "iso3", dataType: "varchar" },
  { name: "code3", dataType: "bigint" },
  { name: "FIPS", dataType: "double" },
  { name: "Country_Region", dataType: "varchar" },
  { name: "Lat", dataType: "double" },
  { name: "Long_", dataType: "double" },
  { name: "Combined_Key", dataType: "varchar" },
] as const;

/** The datasets in the eval workspace, in the app's alias order (t0, t1, t2). */
export const COVID_DATASETS: readonly CovidDataset[] = [
  {
    id: "86440223-249d-4b3d-9be4-159a4e615e0a",
    name: "long-us-deaths.csv",
    fileName: "long-us-deaths.csv",
    truthViewName: "us_deaths",
    columns: [
      ...US_COLUMNS_BEFORE_POPULATION,
      { name: "Population", dataType: "bigint" },
      { name: "date", dataType: "date" },
      { name: "daily_new_deaths", dataType: "bigint" },
    ],
  },
  {
    id: "8fc84d6a-f864-46fe-bd1c-7d7cb897a173",
    name: "long-us-confirmed-cases.csv",
    fileName: "long-us-confirmed-cases.csv",
    truthViewName: "us_cases",
    columns: [
      ...US_COLUMNS_BEFORE_POPULATION,
      { name: "date", dataType: "date" },
      { name: "daily_new_cases", dataType: "bigint" },
    ],
  },
  {
    id: "b3ce316e-d9e5-4279-89d7-bf42ab0d68fb",
    name: "long-global-deaths.csv",
    fileName: "long-global-deaths.csv",
    truthViewName: "global_deaths",
    columns: [
      { name: "Country/Region", dataType: "varchar" },
      { name: "Province/State", dataType: "varchar" },
      { name: "Lat", dataType: "double" },
      { name: "Long", dataType: "double" },
      { name: "date", dataType: "date" },
      { name: "daily_new_deaths", dataType: "bigint" },
    ],
  },
];

/**
 * The workspace schema in the shape the `chat` edge function loads from the
 * database (`WorkspaceChatSchema`). The workspace has no concepts.
 */
export const COVID_WORKSPACE_SCHEMA = {
  datasets: COVID_DATASETS.map((dataset) => {
    return { id: dataset.id, name: dataset.name, description: null };
  }),
  columns: COVID_DATASETS.flatMap((dataset) => {
    return dataset.columns.map((column) => {
      return {
        dataset_id: dataset.id,
        name: column.name,
        data_type: column.dataType,
      };
    });
  }),
  concepts: [],
  conceptAttributes: [],
  conceptStatuses: [],
};
