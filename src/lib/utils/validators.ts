import { z } from "zod";
import { UUID } from "../types/common";

export function uuidType<
  T extends string,
  V extends string = T extends UUID<infer U> ? U : T,
>(): z.ZodEffects<z.ZodString, UUID<V>, string> {
  return z
    .string()
    .uuid()
    .transform((v): UUID<V> => {
      return v as UUID<V>;
    });
}
