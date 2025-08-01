export function throwIfFailed<T>(
  result: T | undefined | null,
  errorMessage: string,
): T {
  if (result == null) {
    throw new Error(errorMessage);
  }
  return result;
}
