export type ValidReturnType = Record<string, unknown> | void;

export type APITypeStruct = Record<
  string,
  Record<
    `/${string}`,
    {
      returnType: ValidReturnType;
    }
  >
>;
export type APITypeDef<T extends APITypeStruct> = T;
