/**
 * Waits for a given number of milliseconds.
 *
 * @param ms The number of milliseconds to delay.
 * @returns A promise that resolves after the given number of milliseconds.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
