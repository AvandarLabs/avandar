/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  SqlTableAliasDataset,
  SqlTableAliasT,
} from "$/models/chat/SqlTableAlias/SqlTableAlias.types.ts";

export { SqlTableAliasModule as SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAliasModule.ts";

export namespace SqlTableAlias {
  export type T = SqlTableAliasT;
  export type Dataset = SqlTableAliasDataset;
}
