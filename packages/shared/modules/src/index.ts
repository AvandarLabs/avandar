export { createModule } from "@modules/createModule.ts";
export { createModuleFactory } from "@modules/createModuleFactory.ts";
export type { Module, Accessors as BaseModule } from "@modules/createModule.ts";
export type { ModuleFactory } from "@modules/createModuleFactory.ts";
export type { EmptyObject } from "@avandar/utils";
export type { UnknownModule } from "@modules/createModule.ts";

// Module introspection helpers, for consumers building on `createModule`.
export type {
  AnyModule,
  MembersOfModule,
  NameOfModule,
  StateOfModule,
} from "@modules/createModule.ts";

// Mixins
export { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";
