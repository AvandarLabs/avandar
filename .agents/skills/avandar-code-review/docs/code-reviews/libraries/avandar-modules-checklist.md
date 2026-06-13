# `@avandar/modules` Checklist

Use this checklist when the repo under review depends on
`@avandar/modules`. Confirm by checking `package.json` (or any
`package.json` in a monorepo) for a `@avandar/modules` dependency, OR by
grepping the diff and surrounding code for imports from `@avandar/modules`
or its short alias `@modules`, OR by checking for calls to `createModule`.

If `@avandar/modules` is not present in the repo, **skip this entire
checklist**.

## Group related helpers into `createModule(...)`

- Group multiple related helpers that share storage, configuration, or
  domain into a `createModule(...)` module instead of leaving them as
  loose free functions. Once a group of functions has a shared purpose
  (for example, a "ChatModelStorage" wrapping `readStoredChatModelId`,
  `writeStoredChatModelId`, and `resolveChatModelId`), use the module
  pattern so callers reach for `ChatModelStorage.resolveChatModelId(...)`
  rather than a flat namespace of unrelated imports.

  This is bad:

  ```ts
  // chatModelStorage.ts
  export function readStoredChatModelId(): string | undefined { ... }
  export function writeStoredChatModelId(modelId: string): void { ... }
  export function resolveChatModelId(args: { ... }): string { ... }

  // call site
  import {
    readStoredChatModelId,
    resolveChatModelId,
    writeStoredChatModelId,
  } from "./chatModelStorage";
  ```

  This is good:

  ```ts
  // ChatModelStorage.ts
  export const ChatModelStorage = createModule("ChatModelStorage", {
    builder: () => {
      return {
        writeStoredChatModelId: (modelId: string) => { ... },
        resolveChatModelId: (args: { ... }) => { ... },
      };
    },
  });

  // call site
  import { ChatModelStorage } from "./ChatModelStorage/ChatModelStorage";
  ChatModelStorage.resolveChatModelId({ ... });
  ```
