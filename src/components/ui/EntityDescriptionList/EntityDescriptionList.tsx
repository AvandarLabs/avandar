import { useMemo } from "react";
import * as R from "remeda";
import { camelToTitleCase } from "@/utils/strings";
import { DescriptionList } from "../DescriptionList/DescriptionList";
import { getEntityFieldRenderOptions } from "./helpers";
import { EntityObject, EntityRenderOptions } from "./types";
import { UnknownFieldValueItem } from "./UnknownFieldValueItem";

type Props<T extends EntityObject, K extends keyof T = keyof T> = {
  entity: T;
} & EntityRenderOptions<T, K>;

export function EntityDescriptionList<
  T extends EntityObject,
  K extends keyof T = keyof T,
>({ entity, excludeKeys = [], ...renderOptions }: Props<T, K>): JSX.Element {
  const excludeKeySet: ReadonlySet<K> = useMemo(() => {
    return new Set(excludeKeys);
  }, [excludeKeys]);

  return (
    <DescriptionList>
      {(R.keys(entity) as K[]).map((key) => {
        if (excludeKeySet.has(key)) {
          return null;
        }

        return (
          <DescriptionList.Item
            key={String(key)}
            label={camelToTitleCase(String(key))}
          >
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
