/** The original property descriptors of the globals a fixture replaces. */
export type GlobalSnapshot = Array<[string, PropertyDescriptor | undefined]>;

/**
 * Records the current descriptor of each named global, so a test can replace
 * browser globals such as `window` or `fetch` and later hand the snapshot to
 * `restoreGlobals`.
 */
function _captureGlobals(keys: readonly string[]): GlobalSnapshot {
  return keys.map((key) => {
    return [key, Object.getOwnPropertyDescriptor(globalThis, key)];
  });
}

/** Puts back the global properties a fixture replaced. */
function _restoreGlobals(
  originals: ReadonlyArray<readonly [string, PropertyDescriptor | undefined]>,
): void {
  originals.forEach(([key, descriptor]) => {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  });
}

/** Captures and restores browser globals for isolated showcase tests. */
export const GlobalSnapshots = {
  /**
   * Records the current descriptor of each named global, so a test can replace
   * browser globals such as `window` or `fetch` and later hand the snapshot to
   * `restoreGlobals`.
   */
  captureGlobals: _captureGlobals,
  /** Puts back the global properties a fixture replaced. */
  restoreGlobals: _restoreGlobals,
};
