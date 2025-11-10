import {
  Button,
  Divider,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Title,
} from "@mantine/core";
import { usePrevious, useUncontrolled } from "@mantine/hooks";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import {
  SegmentedControl,
  SegmentedControlItem,
  SegmentedControlProps,
} from "@/lib/ui/inputs/SegmentedControl";
import { makeSegmentedControlItems } from "@/lib/ui/inputs/SegmentedControl/makeSegmentedControlItems";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNonEmptyArray } from "@/lib/utils/guards/guards";
import { makeBucketRecord } from "@/lib/utils/objects/builders";
import { prop, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import {
  Dataset,
  DatasetId,
  DatasetWithColumns,
} from "@/models/datasets/Dataset";
import { DatasetColumnId } from "@/models/datasets/DatasetColumn";

type Props = {
  /**
   * The IDs of the datasets that we can select columns from
   */
  datasetIds: readonly DatasetId[];
  value?: DatasetColumnId;
  defaultValue?: DatasetColumnId;
  onChange?: (value: DatasetColumnId) => void;

  /**
   * The IDs of the columns to exclude from the list
   */
  excludeColumns?: readonly DatasetColumnId[];
  segmentedControlProps?: Omit<SegmentedControlProps<DatasetColumnId>, "data">;
};

/**
 * A list of columns from local datasets that can be selected with a
 * segmented control.
 *
 * Columns are grouped by dataset and, by default, this also renders
 * a table of contents to also make it easy to scroll from one
 * dataset's list to another.
 *
 * Only one column can be selected at a time.
 */
export function DatasetColumnPickerList({
  datasetIds,
  defaultValue,
  value,
  onChange,
  excludeColumns,
  segmentedControlProps,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();

  // we use `useUncontrolled` so this SegmentedControl (which is technically a
  // `radio` input) can be used with `useForm`
  const [controlledValue, setSelectedValue] = useUncontrolled({
    value,
    defaultValue,
    onChange,
  });
  const [activeDatasetHeading, setActiveDatasetHeading] = useState<
    DatasetId | undefined
  >();

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const datasetHeadingRefs = useRef<Record<DatasetId, HTMLHeadingElement>>({});

  // fetch all datasets and then get the columns
  const [datasets] = DatasetClient.useGetAll({
    where: {
      id: { in: datasetIds },
      workspace_id: { eq: workspace.id },
    },
    useQueryOptions: { enabled: isNonEmptyArray(datasetIds) },
  });

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "in", datasets?.map(prop("id")) ?? []),
    useQueryOptions: { enabled: !!datasets },
  });

  const datasetsWithColumns: readonly DatasetWithColumns[] = useMemo(() => {
    if (!datasets || !datasetColumns) {
      return [];
    }
    const datasetColumnBuckets = makeBucketRecord(datasetColumns, {
      keyFn: prop("datasetId"),
    });

    return datasets.map((dataset) => {
      return {
        ...dataset,
        columns: datasetColumnBuckets[dataset.id]!,
      };
    });
  }, [datasets, datasetColumns]);

  const datasetColumnItems: Array<{
    dataset: Dataset;
    items: Array<SegmentedControlItem<DatasetColumnId>>;
  }> = useMemo(() => {
    return (
      datasetsWithColumns?.map((dataset) => {
        return {
          dataset,
          items: makeSegmentedControlItems(
            dataset.columns?.filter((f) => {
              return !excludeColumns?.includes(f.id);
            }) ?? [],
            {
              valueFn: prop("id"),
              labelFn: prop("name"),
            },
          ),
        };
      }) ?? []
    );
  }, [datasetsWithColumns, excludeColumns]);

  const prevColumnItems = usePrevious(datasetColumnItems);

  // select the first column when the datasets array are defined
  useOnBecomesDefined(datasetsWithColumns, (dsets) => {
    if (dsets[0]?.columns[0]) {
      setActiveDatasetHeading(dsets[0].id);
      setSelectedValue(dsets[0].columns[0].id);
    }
  });

  useEffect(() => {
    // if the columns to exclude now includes the currently selected value,
    // then let's change the selected value to next value in the list
    if (excludeColumns?.includes(controlledValue) && prevColumnItems) {
      const allColumns = prevColumnItems.flatMap(prop("items"));
      const remainingColumns = allColumns.filter((col) => {
        // remember to still include the `controlledValue` because we
        // still need to find its index in the flattened array
        return (
          !excludeColumns?.includes(col.value) || col.value === controlledValue
        );
      });

      const currColumnIdx = remainingColumns.findIndex(
        propEq("value", controlledValue),
      );

      const nextIdx =
        currColumnIdx + 1 >= remainingColumns.length ?
          currColumnIdx - 1
        : currColumnIdx + 1;

      const nextColumn = remainingColumns[nextIdx];
      if (nextColumn) {
        setSelectedValue(nextColumn.value);
      }
    }
  }, [
    excludeColumns,
    datasetColumnItems,
    setSelectedValue,
    controlledValue,
    prevColumnItems,
  ]);

  return (
    <Group align="flex-start" style={{ position: "relative" }}>
      {/* Set up the dataset buttons to act as a table of contents */}
      <Stack gap={0}>
        {datasets?.map((dataset) => {
          const isActive = activeDatasetHeading === dataset.id;
          return (
            <Button
              size="compact-md"
              fw="normal"
              fz="sm"
              key={dataset.id}
              variant={isActive ? "light" : "default"}
              style={{
                border: "none",
                // some styles for a nice smooth transition
                // when a button becomes active
                transition: "transform 100ms ease",
                zIndex: isActive ? 1 : 0,
                transform: isActive ? "scale(1.1)" : "scale(1)",
              }}
              onClick={() => {
                // when we click, scroll the scroll area to the heading that
                // is associated to this button
                const datasetHeading = datasetHeadingRefs.current[dataset.id];
                if (scrollViewportRef.current && datasetHeading) {
                  scrollViewportRef.current.scrollTo({
                    top: datasetHeading.offsetTop,
                  });
                }
                setActiveDatasetHeading(dataset.id);

                // now select the first item in that dataset group
                // first, find the selected dataset
                const datasetItemGroup = datasetColumnItems.find(
                  propEq("dataset.id", dataset.id),
                );
                if (
                  datasetItemGroup &&
                  isNonEmptyArray(datasetItemGroup.items)
                ) {
                  setSelectedValue(datasetItemGroup.items[0].value);
                }
              }}
            >
              {dataset.name}
            </Button>
          );
        })}
      </Stack>

      {/* Render the scroll area for all the columns */}
      <ScrollArea
        viewportRef={scrollViewportRef}
        h={300}
        pr="xs"
        overscrollBehavior="contain"
        onScrollPositionChange={() => {
          // on scroll we need to find the dataset heading that is closest
          // to the top of the scroll area, so we can set that as the
          // active dataset heading
          const datasetNavBtns = objectEntries(datasetHeadingRefs.current);
          const topOfScrollArea =
            scrollViewportRef.current!.getBoundingClientRect().y;

          let closestDatasetToTop = undefined;
          let closestDistanceToTop = Infinity;
          for (let i = 0; i < datasetNavBtns.length; i++) {
            const [datasetId, node] = datasetNavBtns[i]!;
            const yPos = node.getBoundingClientRect().y;
            const distanceFromTop = Math.abs(yPos - topOfScrollArea);
            if (distanceFromTop < closestDistanceToTop) {
              closestDatasetToTop = datasetId;
              closestDistanceToTop = distanceFromTop;
            }
          }
          setActiveDatasetHeading(closestDatasetToTop);
        }}
      >
        <Stack>
          {datasetColumnItems.map(({ dataset, items }, idx) => {
            return (
              <Fragment key={dataset.id}>
                <Flex direction="column" bg="neutral.0">
                  <Title
                    order={6}
                    ta="center"
                    py="xxs"
                    ref={(node) => {
                      if (node) {
                        datasetHeadingRefs.current[dataset.id] = node;
                      }
                    }}
                  >
                    {dataset.name}
                  </Title>
                  <Divider />
                  <SegmentedControl
                    orientation="vertical"
                    data={items}
                    bg="neutral.0"
                    value={controlledValue}
                    onChange={setSelectedValue}
                    fullWidth
                    {...segmentedControlProps}
                  />
                </Flex>
                {idx < datasetColumnItems.length - 1 ?
                  <Divider />
                : null}
              </Fragment>
            );
          })}
        </Stack>
      </ScrollArea>
    </Group>
  );
}
