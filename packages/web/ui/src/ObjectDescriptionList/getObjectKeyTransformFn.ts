import type { ObjectKeyTransformationType } from "./ObjectDescriptionList.types";

import { camelToTitleCase, identity } from "@avandar/utils";
import { match } from "ts-pattern";

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
