/**
 * Whether this is a development build.
 *
 * `import.meta.env` is a Vite-specific global. In a published package consumed
 * outside Vite (webpack, rollup, plain Node) `import.meta.env` is `undefined`,
 * so reading `import.meta.env.DEV` directly throws a TypeError at runtime.
 * This reads it defensively and treats "unknown" as production, which is the
 * safe default: production error messages are the generic, non-leaky ones.
 */
export function isDevBuild(): boolean {
  const meta = import.meta as ImportMeta & {
    env?: { DEV?: boolean };
  };
  return meta.env?.DEV === true;
}
