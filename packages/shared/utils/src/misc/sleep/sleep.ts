/**
 * Sleeps for a given number of milliseconds before continuing.
 *
 * @param ms The number of milliseconds to delay.
 * @returns A promise that resolves after the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
