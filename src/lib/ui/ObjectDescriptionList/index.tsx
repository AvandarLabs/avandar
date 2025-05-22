import { useMemo } from "react";
import { StringKeyOf } from "type-fest";
import { objectKeys } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings";
import { DescriptionList } from "../DescriptionList";
import { getObjectFieldRenderOptions } from "./helpers";
import { DescribableObject, ObjectRenderOptions } from "./types";
import { UnknownFieldValueItem } from "./UnknownFieldValueItem";

type Props<T extends DescribableObject> = {
  data: T;
} & ObjectRenderOptions<NonNullable<T>>;

export function ObjectDescriptionList<T extends DescribableObject>({
  data,
  excludeKeys = [],
  ...renderOptions
}: Props<T>): JSX.Element {
  const excludeKeySet: ReadonlySet<StringKeyOf<T>> = useMemo(() => {
    return new Set(excludeKeys);
  }, [excludeKeys]);

  return (
    <DescriptionList>
      {objectKeys(data).map((key) => {
        if (excludeKeySet.has(key)) {
          return null;
        }

        return (
          <DescriptionList.Item key={key} label={camelToTitleCase(String(key))}>
            <UnknownFieldValueItem
              value={data[key]}
              {...getObjectFieldRenderOptions(renderOptions, key)}
            />
          </DescriptionList.Item>
        );
      })}
    </DescriptionList>
  );
}
