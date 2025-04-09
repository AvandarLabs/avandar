import { useMemo } from "react";
import { ObjectStringKey } from "@/lib/types/utilityTypes";
import { objectKeys } from "@/lib/utils/objects";
import { camelToTitleCase } from "@/lib/utils/strings";
import { DescriptionList } from "../DescriptionList/DescriptionList";
import { getEntityFieldRenderOptions } from "./helpers";
import { EntityObject, EntityRenderOptions } from "./types";
import { UnknownFieldValueItem } from "./UnknownFieldValueItem";

type Props<T extends EntityObject> = {
  entity: T;
} & EntityRenderOptions<T>;

export function EntityDescriptionList<T extends EntityObject>({
  entity,
  excludeKeys = [],
  ...renderOptions
}: Props<T>): JSX.Element {
  const excludeKeySet: ReadonlySet<ObjectStringKey<T>> = useMemo(() => {
    return new Set(excludeKeys);
  }, [excludeKeys]);

  return (
    <DescriptionList>
      {objectKeys(entity).map((key) => {
        if (excludeKeySet.has(key)) {
          return null;
        }

        return (
          <DescriptionList.Item key={key} label={camelToTitleCase(String(key))}>
            <UnknownFieldValueItem
              value={entity[key]}
              {...getEntityFieldRenderOptions(renderOptions, key)}
            />
          </DescriptionList.Item>
        );
      })}
    </DescriptionList>
  );
}
