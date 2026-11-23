/** Product module specifiers mapped to adapter controller shims. */
export type Aliases = Record<string, string>;

/** Product source files a build read, by relative path, with their hashes. */
export type ImportedFiles = Map<string, { path: string; sha256: string }>;
