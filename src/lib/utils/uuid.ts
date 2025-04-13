import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { UUID } from "@/lib/types/common";
import { Logger } from "../Logger";

const uuidValidator = z
  .string()
  .uuid()
  .transform(<T extends string>(s: string): UUID<T> => {
    return s as UUID<T>;
  });

/**
 * Generates a random UUID, or casts the given string to type UUID<T>
 * if it successfully validates as a UUID.
 * @returns A random UUID string.
 * @throws ZodError if a string is provided and it is not a valid UUID.
 */
export function uuid<T extends string = never>(stringToCast?: string): UUID<T> {
  if (stringToCast) {
    try {
      const stringAsUUID = uuidValidator.parse(stringToCast);
      return stringAsUUID as UUID<T>;
    } catch (e) {
      Logger.error(`Invalid UUID: ${stringToCast}`);
      throw e;
    }
  }

  return uuidv4() as UUID<T>;
}
