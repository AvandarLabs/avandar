import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Database, Json } from "$/types/database.types";

/** How many datasets the measurement seeds. */
export const MEASUREMENT_DATASET_COUNT = 100;

/** Rows in each seeded dataset: a large line list. */
export const MEASUREMENT_ROWS_PER_DATASET = 2_000;

/**
 * Every seeded dataset's name starts with this, which is how cleanup
 * finds them.
 */
export const MEASUREMENT_NAME_PREFIX = "Crosswalk measurement";

/** The seeded crosswalk's name, which is how the seed and cleanup find it. */
export const MEASUREMENT_CROSSWALK_NAME =
  "Crosswalk measurement (100 datasets)";

type MeasurementColumn = {
  name: string;
  dataType: AvaDataType.T;
  duckDbType: "VARCHAR" | "BIGINT" | "DATE";
  /** The column's value for row `i` of `range(rowCount)`. */
  valueSql: string;
};

/** One layout the measurement seeds: its datasets share these columns. */
export type MeasurementLayout = {
  key: "kings" | "queens" | "bronx";
  datasetCount: number;
  columns: readonly MeasurementColumn[];
};

const ONSET_SQL = "DATE '2026-01-01' + CAST(i % 120 AS INTEGER)";

/**
 * Three layouts, as a state's counties might send line lists: 50, 35, and
 * 15 datasets.
 */
export const MEASUREMENT_LAYOUTS: readonly MeasurementLayout[] = [
  {
    key: "kings",
    datasetCount: 50,
    columns: [
      {
        name: "case_id",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "'K-' || CAST(i AS VARCHAR)",
      },
      {
        name: "sex",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "CASE i % 2 WHEN 0 THEN 'Male' ELSE 'Female' END",
      },
      {
        name: "rash_onset_date",
        dataType: "date",
        duckDbType: "DATE",
        valueSql: ONSET_SQL,
      },
      {
        name: "zip_code",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "CAST(10451 + i % 50 AS VARCHAR)",
      },
      {
        name: "county",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "'Kings'",
      },
    ],
  },
  {
    key: "queens",
    datasetCount: 35,
    columns: [
      {
        name: "CaseNo",
        dataType: "bigint",
        duckDbType: "BIGINT",
        valueSql: "i",
      },
      {
        name: "GENDER",
        dataType: "bigint",
        duckDbType: "BIGINT",
        valueSql: "1 + i % 2",
      },
      {
        name: "onset_dt",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: `strftime(${ONSET_SQL}, '%m/%d/%Y')`,
      },
      {
        name: "zip",
        dataType: "bigint",
        duckDbType: "BIGINT",
        valueSql: "501 + i % 50",
      },
    ],
  },
  {
    key: "bronx",
    datasetCount: 15,
    columns: [
      {
        name: "id",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "'B-' || CAST(i AS VARCHAR)",
      },
      {
        name: "sex_cd",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "CASE i % 2 WHEN 0 THEN 'M' ELSE 'F' END",
      },
      {
        name: "rash_onset",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: `strftime(${ONSET_SQL}, '%Y-%m-%d')`,
      },
      {
        name: "postal_code",
        dataType: "varchar",
        duckDbType: "VARCHAR",
        valueSql: "CAST(11201 + i % 30 AS VARCHAR)",
      },
      {
        name: "age_mo",
        dataType: "bigint",
        duckDbType: "BIGINT",
        valueSql: "6 + i % 200",
      },
    ],
  },
];

/** One dataset the measurement seeds. */
export type MeasurementDataset = {
  id: string;
  name: string;
  layoutKey: MeasurementLayout["key"];
};

/**
 * Every seeded dataset, layout by layout, named
 * `Crosswalk measurement <layout> <nn>`.
 */
export function buildMeasurementDatasets(
  makeId: () => string,
): MeasurementDataset[] {
  return MEASUREMENT_LAYOUTS.flatMap((layout) => {
    return Array.from({ length: layout.datasetCount }, (_item, index) => {
      const number = String(index + 1).padStart(2, "0");
      return {
        id: makeId(),
        name: `${MEASUREMENT_NAME_PREFIX} ${layout.key} ${number}`,
        layoutKey: layout.key,
      };
    });
  });
}

/** A `COPY` that writes one layout's rows to a Parquet file. */
export function buildParquetSql(
  options: Readonly<{
    layout: MeasurementLayout;
    rowCount: number;
    outputPath: string;
  }>,
): string {
  const selects = options.layout.columns.map((column) => {
    return `CAST(${column.valueSql} AS ${column.duckDbType}) AS "${column.name}"`;
  });
  const path = options.outputPath.replaceAll("'", "''");
  return `COPY (SELECT ${selects.join(", ")} FROM range(${options.rowCount}) AS t(i)) TO '${path}' (FORMAT parquet)`;
}

/** One layout's columns as `rpc_datasets__add_csv_file_dataset` takes them. */
export function toDatasetColumnInputs(
  layout: MeasurementLayout,
): Array<Database["public"]["CompositeTypes"]["dataset_column_input"]> {
  return layout.columns.map((column, index) => {
    return {
      original_name: column.name,
      name: column.name,
      description: null,
      original_data_type: column.duckDbType,
      detected_data_type: column.duckDbType,
      data_type: column.dataType,
      column_idx: index,
    };
  });
}

/** The combined dataset's columns, from the reference (Kings) layout. */
const COMBINED_COLUMNS = MEASUREMENT_LAYOUTS[0]!.columns.map((column) => {
  return { name: column.name, dataType: column.dataType };
});

function _columnFill(
  sourceColumn: string,
  convert?: CrosswalkMapping.Convert,
): CrosswalkMapping.Fill {
  return {
    kind: "column",
    sourceColumn,
    convert,
    codeListId: undefined,
    holdsLabels: false,
  };
}

/** How each layout fills each combined column, in `COMBINED_COLUMNS` order. */
const FILLS_BY_LAYOUT: Record<
  MeasurementLayout["key"],
  readonly CrosswalkMapping.Fill[]
> = {
  kings: COMBINED_COLUMNS.map((column) => {
    return _columnFill(column.name);
  }),
  queens: [
    _columnFill("CaseNo"),
    _columnFill("GENDER"),
    _columnFill("onset_dt", { kind: "parse_date", format: "%m/%d/%Y" }),
    _columnFill("zip", { kind: "pad_text", length: 5 }),
    { kind: "constant", value: "Queens" },
  ],
  bronx: [
    _columnFill("id"),
    _columnFill("sex_cd"),
    _columnFill("rash_onset", { kind: "parse_date", format: "%Y-%m-%d" }),
    _columnFill("postal_code"),
    { kind: "empty" },
  ],
};

/**
 * The arguments of `rpc_crosswalks__save` for the seeded crosswalk, in the
 * snake_case the app sends. Every value is plain JSON, so the typed
 * Supabase client takes it without a cast.
 */
export type MeasurementSaveParams = {
  p_crosswalk_id: string;
  p_settings: {
    name: string;
    description: null;
    codes_output_as: "labels";
    adds_source_column: boolean;
  };
  p_columns: Array<{
    id: string;
    name: string;
    position: number;
    data_type: AvaDataType.T;
    entry_id: null;
  }>;
  p_layouts: Array<{
    id: string;
    signature: string;
    column_names: string[];
    is_reference: boolean;
    status: "mapped";
  }>;
  p_datasets: Array<{ dataset_id: string; layout_id: string }>;
  p_mappings: Array<{
    id: string;
    layout_id: string;
    column_id: string;
    fill: Json;
    status: "confirmed";
    confidence: null;
    reason: null;
  }>;
};

/**
 * The parameters of `rpc_crosswalks__save` for the seeded crosswalk: the
 * Kings layout as the mapped reference, the Queens and Bronx layouts
 * mapped with conversions, a fixed value, and an empty column, and every
 * dataset in its layout.
 */
export function buildMeasurementSaveParams(
  options: Readonly<{
    crosswalkId: string;
    datasets: readonly MeasurementDataset[];
    makeId: () => string;
  }>,
): MeasurementSaveParams {
  const columns = COMBINED_COLUMNS.map((column, position) => {
    return {
      id: options.makeId(),
      name: column.name,
      position,
      data_type: column.dataType,
      entry_id: null,
    };
  });
  const layouts = MEASUREMENT_LAYOUTS.map((layout, index) => {
    const columnNames = layout.columns.map((column) => {
      return column.name;
    });
    return {
      id: options.makeId(),
      key: layout.key,
      signature: CrosswalkLayout.buildSignature(columnNames),
      column_names: columnNames,
      is_reference: index === 0,
      status: "mapped" as const,
    };
  });
  return {
    p_crosswalk_id: options.crosswalkId,
    p_settings: {
      name: MEASUREMENT_CROSSWALK_NAME,
      description: null,
      codes_output_as: "labels" as const,
      adds_source_column: true,
    },
    p_columns: columns,
    p_layouts: layouts.map(({ key: _key, ...layout }) => {
      return layout;
    }),
    p_datasets: _buildMemberships({ datasets: options.datasets, layouts }),
    p_mappings: _buildMappings({ columns, layouts, makeId: options.makeId }),
  };
}

function _buildMemberships(
  options: Readonly<{
    datasets: readonly MeasurementDataset[];
    layouts: ReadonlyArray<{ id: string; key: MeasurementLayout["key"] }>;
  }>,
): MeasurementSaveParams["p_datasets"] {
  return options.datasets.map((dataset) => {
    const layout = options.layouts.find((candidate) => {
      return candidate.key === dataset.layoutKey;
    });
    return { dataset_id: dataset.id, layout_id: layout!.id };
  });
}

function _buildMappings(
  options: Readonly<{
    columns: ReadonlyArray<{ id: string }>;
    layouts: ReadonlyArray<{ id: string; key: MeasurementLayout["key"] }>;
    makeId: () => string;
  }>,
): MeasurementSaveParams["p_mappings"] {
  return options.layouts.flatMap((layout) => {
    return options.columns.map((column, index) => {
      return {
        id: options.makeId(),
        layout_id: layout.id,
        column_id: column.id,
        fill: CrosswalkMapping.fillToDBJson(
          FILLS_BY_LAYOUT[layout.key][index]!,
        ) as Json,
        status: "confirmed" as const,
        confidence: null,
        reason: null,
      };
    });
  });
}
