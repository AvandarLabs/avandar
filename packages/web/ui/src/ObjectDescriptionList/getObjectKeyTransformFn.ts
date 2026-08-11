import { camelToTitleCase, identity } from "@avandar/utils";
import { match } from "ts-pattern";
import type { ObjectKeyTransformationType } from "./ObjectDescriptionList.types";

export function getObjectKeyTransformFn(
  transformationType: ObjectKeyTransformationType,
): (key: string) => string {
  return match(transformationType)
    .with("camel-to-title-case", () => {
      return camelToTitleCase;
    })
    .with("none", () => {
      return identity;
    })
    .exhaustive();
}
