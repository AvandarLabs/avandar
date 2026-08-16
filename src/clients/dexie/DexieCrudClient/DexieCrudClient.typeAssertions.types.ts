import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";

/** Valid scalar model primary keys name a database read field. */
type ValidScalarModelPrimaryKey = DexieCrudModelSpec<{
  modelName: "ValidScalarModelPrimaryKey";
  primaryKey: "dashboardId";
  primaryKeyType: string;
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: string };
    DBUpdate: Partial<{ dashboardId: string; datasetId: string }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: string };
    Update: Partial<{ dashboardId: string; datasetId: string }>;
  };
}>;

/** Valid compound model primary keys name at least two database read fields. */
type ValidCompoundModelPrimaryKey = DexieCrudModelSpec<{
  modelName: "ValidCompoundModelPrimaryKey";
  primaryKey: ["dashboardId", "datasetId"];
  primaryKeyType: [string, number];
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: number };
    DBUpdate: Partial<{ dashboardId: string; datasetId: number }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: number };
    Update: Partial<{ dashboardId: string; datasetId: number }>;
  };
}>;

// @ts-expect-error Scalar model keys cannot use compound key values.
type ScalarPathCompoundValue = DexieCrudModelSpec<{
  modelName: "ScalarPathCompoundValue";
  primaryKey: "dashboardId";
  primaryKeyType: [string, number];
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: number };
    DBUpdate: Partial<{ dashboardId: string; datasetId: number }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: number };
    Update: Partial<{ dashboardId: string; datasetId: number }>;
  };
}>;

// @ts-expect-error Compound model keys cannot use scalar key values.
type CompoundPathScalarValue = DexieCrudModelSpec<{
  modelName: "CompoundPathScalarValue";
  primaryKey: ["dashboardId", "datasetId"];
  primaryKeyType: string;
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: number };
    DBUpdate: Partial<{ dashboardId: string; datasetId: number }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: number };
    Update: Partial<{ dashboardId: string; datasetId: number }>;
  };
}>;

// @ts-expect-error Compound key values must follow the selected DBRead order.
type CompoundPathWrongValueOrder = DexieCrudModelSpec<{
  modelName: "CompoundPathWrongValueOrder";
  primaryKey: ["dashboardId", "datasetId"];
  primaryKeyType: [number, string];
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: number };
    DBUpdate: Partial<{ dashboardId: string; datasetId: number }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: number };
    Update: Partial<{ dashboardId: string; datasetId: number }>;
  };
}>;

// @ts-expect-error Model scalar keys must exist on the DBRead shape.
type MisspelledModelPrimaryKey = DexieCrudModelSpec<{
  modelName: "MisspelledModelPrimaryKey";
  primaryKey: "dashbordId";
  primaryKeyType: string;
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: string };
    DBUpdate: Partial<{ dashboardId: string; datasetId: string }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: string };
    Update: Partial<{ dashboardId: string; datasetId: string }>;
  };
}>;

// @ts-expect-error Compound model keys require at least two DBRead fields.
type EmptyCompoundModelPrimaryKey = DexieCrudModelSpec<{
  modelName: "EmptyCompoundModelPrimaryKey";
  primaryKey: [];
  primaryKeyType: [string, string];
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: string };
    DBUpdate: Partial<{ dashboardId: string; datasetId: string }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: string };
    Update: Partial<{ dashboardId: string; datasetId: string }>;
  };
}>;

// @ts-expect-error Compound model keys require at least two DBRead fields.
type SingleMemberCompoundModelPrimaryKey = DexieCrudModelSpec<{
  modelName: "SingleMemberCompoundModelPrimaryKey";
  primaryKey: ["dashboardId"];
  primaryKeyType: [string, string];
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: string };
    DBUpdate: Partial<{ dashboardId: string; datasetId: string }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: string };
    Update: Partial<{ dashboardId: string; datasetId: string }>;
  };
}>;

// @ts-expect-error Compound model keys must exist on the DBRead shape.
type MissingCompoundMemberModelPrimaryKey = DexieCrudModelSpec<{
  modelName: "MissingCompoundMemberModelPrimaryKey";
  primaryKey: ["dashboardId", "missingId"];
  primaryKeyType: [string, string];
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: string };
    DBUpdate: Partial<{ dashboardId: string; datasetId: string }>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: string };
    Update: Partial<{ dashboardId: string; datasetId: string }>;
  };
}>;

/** Compile-time coverage for valid and invalid Dexie model primary keys. */
export type DexieCrudModelSpecTypeAssertions =
  | ValidScalarModelPrimaryKey
  | ValidCompoundModelPrimaryKey
  | ScalarPathCompoundValue
  | CompoundPathScalarValue
  | CompoundPathWrongValueOrder
  | MisspelledModelPrimaryKey
  | EmptyCompoundModelPrimaryKey
  | SingleMemberCompoundModelPrimaryKey
  | MissingCompoundMemberModelPrimaryKey;
