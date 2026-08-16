import Dexie from "dexie";
import { DexieDBVersionManager } from "@/clients/dexie/DexieDBVersionManager";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";

type VersionKeyTestModel = DexieCrudModelSpec<{
  modelName: "VersionKeyTest";
  primaryKey: "dashboardId";
  primaryKeyType: string;
  dbTypes: {
    DBRead: { dashboardId: string; datasetId: string; downloadedAt: string };
    DBUpdate: Record<string, never>;
  };
  modelTypes: {
    Read: { dashboardId: string; datasetId: string; downloadedAt: string };
    Update: Record<string, never>;
  };
}>;

const VersionKeyTestManager = DexieDBVersionManager.make<{
  v1: { version: 1; models: [VersionKeyTestModel] };
}>();

const VERSION_CONFIG = {
  db: new Dexie("VersionKeyTypeAssertions"),
  version: 1 as const,
  models: {
    VersionKeyTest: {
      primaryKey: "dashboardId" as const,
    },
  },
};

VersionKeyTestManager.defineVersion<1>({
  ...VERSION_CONFIG,
  models: {
    VersionKeyTest: {
      // @ts-expect-error Schema scalar keys must exist on DBRead.
      primaryKey: "dashbordId",
    },
  },
});
VersionKeyTestManager.defineVersion<1>({
  ...VERSION_CONFIG,
  models: {
    VersionKeyTest: {
      // @ts-expect-error Compound keys require at least two members.
      primaryKey: [],
    },
  },
});
VersionKeyTestManager.defineVersion<1>({
  ...VERSION_CONFIG,
  models: {
    VersionKeyTest: {
      // @ts-expect-error Compound keys require at least two members.
      primaryKey: ["dashboardId"],
    },
  },
});
VersionKeyTestManager.defineVersion<1>({
  ...VERSION_CONFIG,
  models: {
    VersionKeyTest: {
      // @ts-expect-error Every compound member must exist on DBRead.
      primaryKey: ["dashboardId", "missingId"],
    },
  },
});
