import { identity } from "@utils/misc/identity";
import { camelToTitleCase } from "$/lib/strings/transformations";
import { match } from "ts-pattern";
import type { ObjectKeyTransformationType } from "@ui/ObjectDescriptionList/ObjectDescriptionList.types";

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
