export const Logger = {
  /**
   * Logs an error to the console.
   *
   * @param error - The error to log. It can technically be of any type because
   * javascript lets you `throw` anything, even primitive types.
   * @param extraData - Optional extra data to log.
   */
  error: (error: unknown, extraData?: unknown): void => {
    console.error(error, extraData);
  },
};
