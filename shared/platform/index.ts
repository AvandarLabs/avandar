export { isDesktop } from "./isDesktop.ts";
export type { Platform } from "./types/Platform.types.ts";

export type {
  DuckDbClient,
  StructuredQuery,
  UploadSource,
  DatasetImportOptions,
  DatasetImportResult,
} from "./types/DuckDbClient.types.ts";

export type {
  RdbClient,
  RdbTx,
  ModelName,
  RdbFilter,
} from "./types/RdbClient.types.ts";
export { asModelName } from "./types/RdbClient.types.ts";

export type {
  DatasetBlobStore,
  DatasetBlobKey,
  DatasetBlobStat,
} from "./types/DatasetBlobStore.types.ts";
export {
  asDatasetBlobKey,
  DatasetBlobKeys,
} from "./types/DatasetBlobStore.types.ts";

export type {
  AuthProvider,
  AuthCredentials,
  Session,
  Unsubscribe,
} from "./types/AuthProvider.types.ts";

export type {
  SyncEngine,
  SyncMutation,
  SyncStatus,
} from "./types/SyncEngine.types.ts";

export type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "./types/ServerApiClient.types.ts";
