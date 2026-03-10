import { identity } from "@avandar/utils";
import { camelToTitleCase } from "$/lib/strings/transformations";
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
