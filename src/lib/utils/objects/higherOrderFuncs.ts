/**
 * Returns a getter function that returns the value of a property of an object.
 * @param key The key of the property to get.
 * @returns A function that returns the value of the property.
 */
export function getProp<T extends object, K extends keyof T>(
  key: K,
): (obj: T) => T[K] {
  return (obj: T) => {
    return obj[key];
  };
}

/**
 * Returns a function that checks if an object has a property with a specific
 * value.
 * @param key The key of the property to check.
 * @param value The value to check.
 * @returns A function that returns true if the object has the property with
 * the specified value.
 */
export function propEquals<T extends object, K extends keyof T>(
  key: K,
  value: T[K],
): (obj: T) => boolean {
  return (obj: T) => {
    return obj[key] === value;
  };
}
