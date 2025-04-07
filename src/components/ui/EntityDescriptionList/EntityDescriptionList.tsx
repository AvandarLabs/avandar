import { List, Text } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import * as R from "remeda";
import { DescriptionList } from "../DescriptionList/DescriptionList";
import { CollapsableItem } from "./CollapsableItem";

type UnknownObject = Record<string, unknown>;

type BaseRenderOptions = {
  replaceEmptyString?: string;
  replaceNullOrUndefined?: string;
  replaceBooleanTrue?: string;
  replaceBooleanFalse?: string;
};

export type EntityRenderOptionsMap<
  T extends UnknownObject,
  K extends keyof T = keyof T,
> = {
  [Key in K]?: T[Key] extends UnknownObject ?
    NestedEntityRenderOptions<T[Key], keyof T[Key]>
  : T[Key] extends ReadonlyArray<infer ArrayType extends UnknownObject> ?
    NestedEntityRenderOptions<ArrayType, keyof ArrayType>
  : BaseRenderOptions;
};

export type NestedEntityRenderOptions<
  T extends UnknownObject,
  K extends keyof T = keyof T,
> = BaseRenderOptions & {
  excludeKeys?: readonly K[];
  titleKey?: K;

  /**
   * Maps a key of the entity to its render options. This will take
   * precedence over the global entity render options.
   */
  renderOptionsByKey?: EntityRenderOptionsMap<T>;
};

type Props<T extends UnknownObject, K extends keyof T = keyof T> = {
  entity: T;
} & NestedEntityRenderOptions<T, K>;

function isNestedEntityRenderOptions<
  T extends UnknownObject,
  K extends keyof T,
>(
  options: BaseRenderOptions | NestedEntityRenderOptions<T, K> | undefined,
): options is NestedEntityRenderOptions<T, K> {
  return (
    !!options &&
    typeof options === "object" &&
    ("renderOptionsByKey" in options ||
      "excludeKeys" in options ||
      "titleKey" in options)
  );
}

function camelToTitleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

export function EntityDescriptionList<
  T extends UnknownObject,
  K extends keyof T = keyof T,
>({
  entity,
  excludeKeys = [],
  replaceNullOrUndefined = "No value",
  replaceEmptyString = "Empty text",
  replaceBooleanTrue = "Yes",
  replaceBooleanFalse = "No",
  renderOptionsByKey,
}: Props<T, K>): JSX.Element {
  const excludeKeySet: ReadonlySet<K> = useMemo(() => {
    return new Set(excludeKeys);
  }, [excludeKeys]);

  const keysToRender: readonly K[] = useMemo(() => {
    return R.pipe(
      R.keys(entity) as K[],
      R.filter((key) => {
        return !excludeKeySet.has(key);
      }),
    );
  }, [entity, excludeKeySet]);

  const renderValue = (key: K, value: T[K]): ReactNode => {
    const renderOptions = renderOptionsByKey?.[key];
    const nullOrUndefinedVal =
      renderOptions?.replaceNullOrUndefined ?? replaceNullOrUndefined;
    const emptyStringVal =
      renderOptions?.replaceEmptyString ?? replaceEmptyString;
    const booleanTrueVal =
      renderOptions?.replaceBooleanTrue ?? replaceBooleanTrue;
    const booleanFalseVal =
      renderOptions?.replaceBooleanFalse ?? replaceBooleanFalse;

    if (value === null || value === undefined) {
      return <Text fs="italic">{nullOrUndefinedVal}</Text>;
    }

    if (value === "") {
      return <Text fs="italic">{emptyStringVal}</Text>;
    }

    if (typeof value === "string") {
      return <Text>{value}</Text>;
    }

    if (typeof value === "number") {
      return Intl.NumberFormat().format(value);
    }

    if (typeof value === "boolean") {
      return value ? booleanTrueVal : booleanFalseVal;
    }

    if (R.isDate(value)) {
      return value.toISOString();
    }

    const {
      titleKey,
      renderOptionsByKey: subRenderOptions,
      excludeKeys: subExcludeKeys,
    } = isNestedEntityRenderOptions(renderOptions) ? renderOptions : {};

    if (R.isArray(value)) {
      return (value as Array<T[K]>).map((val, index) => {
        const listItemContents =
          R.isPlainObject(val) ?
            <CollapsableItem
              key={index}
              label={titleKey ? String(val[titleKey]) : String(index + 1)}
            >
              <EntityDescriptionList
                entity={val}
                replaceNullOrUndefined={nullOrUndefinedVal}
                replaceEmptyString={emptyStringVal}
                replaceBooleanTrue={booleanTrueVal}
                replaceBooleanFalse={booleanFalseVal}
                renderOptionsByKey={
                  subRenderOptions as EntityRenderOptionsMap<typeof val>
                }
                excludeKeys={subExcludeKeys}
              />
            </CollapsableItem>
          : renderValue(key, val);

        return (
          <List
            listStyleType="none"
            key={index}
            classNames={{
              itemWrapper: "w-full",
              itemLabel: "w-full",
            }}
          >
            <List.Item>{listItemContents}</List.Item>
          </List>
        );
      });
    }

    if (R.isPlainObject(value)) {
      return (
        <EntityDescriptionList
          entity={value}
          replaceNullOrUndefined={nullOrUndefinedVal}
          replaceEmptyString={emptyStringVal}
          replaceBooleanTrue={booleanTrueVal}
          replaceBooleanFalse={booleanFalseVal}
          renderOptionsByKey={
            subRenderOptions as EntityRenderOptionsMap<typeof value>
          }
          excludeKeys={subExcludeKeys}
        />
      );
    }

    // fallback is to just cast the value to a string
    return <Text>{String(value)}</Text>;
  };

  return (
    <DescriptionList>
      {keysToRender.map((key) => {
        return (
          <DescriptionList.Item
            key={String(key)}
            label={camelToTitleCase(String(key))}
          >
            {renderValue(key, entity[key])}
          </DescriptionList.Item>
        );
      })}
    </DescriptionList>
  );
}
