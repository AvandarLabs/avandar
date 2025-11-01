import { match } from "ts-pattern";
import { ObjectKeyTransformationType } from "./ObjectDescriptionList.types";
import { identity } from "@/lib/utils/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";

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
