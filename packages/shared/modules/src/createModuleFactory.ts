import { createModule } from "./createModule.ts";
import type {
  Accessors,
  AnyModule,
  MembersOfModule,
  Module,
  NameOfModule,
  StateOfModule,
} from "./createModule.ts";
import type { EmptyObject } from "@utils/types/common.types.ts";

export type ModuleFactory<ChildModule extends AnyModule> = Module<
  `${NameOfModule<ChildModule>}Factory`,
  EmptyObject,
  {
    create: (childState: StateOfModule<ChildModule>) => ChildModule;
  }
>;

export function createModuleFactory<ChildModule extends AnyModule>(
  moduleName: NameOfModule<ChildModule>,
  options: {
    childBuilder: (
      accessors: Accessors<
        NameOfModule<ChildModule>,
        StateOfModule<ChildModule>,
        MembersOfModule<ChildModule>
      >,
    ) => MembersOfModule<ChildModule>;
  },
): ModuleFactory<ChildModule> {
  return createModule(`${moduleName}Factory`, {
    builder: () => {
      return {
        create: (moduleState: StateOfModule<ChildModule>): ChildModule => {
          const { mixin, ...accessors } = createModule(moduleName, {
            state: moduleState,
          });
          const childMembers = options.childBuilder(
            accessors as unknown as Accessors<
              NameOfModule<ChildModule>,
              StateOfModule<ChildModule>,
              MembersOfModule<ChildModule>
            >,
          );
          return {
            ...accessors,
            ...childMembers,
          } as ChildModule;
        },
      };
    },
  }) as ModuleFactory<ChildModule>;
}
