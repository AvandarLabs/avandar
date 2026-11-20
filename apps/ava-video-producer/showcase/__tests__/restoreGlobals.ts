/** The original property descriptors of the globals a fixture replaces. */
export type GlobalSnapshot = ReadonlyArray<
  readonly [string, PropertyDescriptor | undefined]
>;

/**
 * Records the current descriptor of each named global, so a test can replace
 * browser globals such as `window` or `fetch` and later hand the snapshot to
 * `restoreGlobals`.
 */
export function captureGlobals(keys: readonly string[]): GlobalSnapshot {
  return keys.map((key) => {
    return [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const;
  });
}

/** Puts back the global properties a fixture replaced. */
export function restoreGlobals(originals: GlobalSnapshot): void {
  originals.forEach(([key, descriptor]) => {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  });
}
