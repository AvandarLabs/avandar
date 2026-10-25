/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PostgresDatabaseConnectionModel,
  PostgresSslMode,
  VaultSecretId,
} from "$/models/connections/PostgresDatabaseConnection/PostgresDatabaseConnection.types.ts";

export { PostgresDatabaseConnectionParsers } from "$/models/connections/PostgresDatabaseConnection/PostgresDatabaseConnectionParsers.ts";

export namespace PostgresDatabaseConnection {
  export type T<K extends keyof PostgresDatabaseConnectionModel = "Read"> =
    PostgresDatabaseConnectionModel[K];
  export type SslMode = PostgresSslMode;
}

export type { VaultSecretId };
