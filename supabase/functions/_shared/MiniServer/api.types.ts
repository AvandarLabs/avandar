export type ValidReturnType = Record<string, unknown> | void | Response;

export type APITypeStruct = Record<
  string,
  Record<
    `/${string}`,
    {
      returnType: ValidReturnType;
    }
  >
>;

/**
 * This is used to enforce that `T` is of the appropriate structure.
 * Functionally, it is a no-op. We use this only at the type-level to enforce
 * that an API type is well-formed.
 */
export type APITypeDef<T extends APITypeStruct> = T;
