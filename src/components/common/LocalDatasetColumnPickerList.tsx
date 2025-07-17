import {
  Button,
  Divider,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Title,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOnBecomesDefined } from "@/lib/hooks/useOnBecomesDefined";
import {
  SegmentedControl,
  SegmentedControlItem,
  SegmentedControlProps,
} from "@/lib/ui/inputs/SegmentedControl";
import { makeSegmentedControlItems } from "@/lib/ui/inputs/SegmentedControl/makeSegmentedControlItems";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNonEmptyArray } from "@/lib/utils/guards";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset, LocalDatasetId } from "@/models/LocalDataset/types";

type Props = {
  /**
   * The IDs of the datasets that we can select columns from
   */
  datasetIds: readonly LocalDatasetId[];
  value?: LocalDatasetFieldId;
  defaultValue?: LocalDatasetFieldId;
  onChange?: (value: LocalDatasetFieldId) => void;

  /**
   * The IDs of the columns to exclude from the list
   */
  excludeColumns?: readonly LocalDatasetFieldId[];
  segmentedControlProps?: Omit<
    SegmentedControlProps<LocalDatasetFieldId>,
    "data"
  >;
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
export function LocalDatasetColumnPickerList({
  datasetIds,
  defaultValue,
  value,
  onChange,
  excludeColumns,
  segmentedControlProps,
}: Props): JSX.Element {
  // we use `useUncontrolled` so this SegmentedControl (which is technically a
  // `radio` input) can be used with `useForm`
  const [controlledValue, onChangeValue] = useUncontrolled({
    value,
    defaultValue,
    onChange,
  });
  const [activeDatasetHeading, setActiveDatasetHeading] = useState<
    LocalDatasetId | undefined
  >();

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const datasetHeadingRefs = useRef<Record<LocalDatasetId, HTMLHeadingElement>>(
    {},
  );

  // fetch all datasets and then get the columns
  const [datasets] = LocalDatasetClient.useGetAll({
    ...where("id", "in", datasetIds),
    useQueryOptions: { enabled: isNonEmptyArray(datasetIds) },
  });

  const datasetColumnItems: Array<{
    dataset: LocalDataset;
    items: Array<SegmentedControlItem<LocalDatasetFieldId>>;
  }> = useMemo(() => {
    return (
      datasets?.map((dataset) => {
        return {
          dataset,
          items: makeSegmentedControlItems(
            dataset.fields?.filter((f) => {
              return !excludeColumns?.includes(f.id);
            }) ?? [],
            {
              valueFn: getProp("id"),
              labelFn: getProp("name"),
            },
          ),
        };
      }) ?? []
    );
  }, [datasets, excludeColumns]);

  // select the first column when the datasets array are defined
  useOnBecomesDefined(
    datasets,
    useCallback(
      (dsets) => {
        if (dsets[0]?.fields[0]) {
          setActiveDatasetHeading(dsets[0].id);
          onChangeValue(dsets[0].fields[0].id);
        }
      },
      [onChangeValue],
    ),
  );

  useEffect(() => {
    // if the columns to exclude now includes the currently selected value,
    // then let's change the selected value to the first column of the dataset
    if (excludeColumns?.includes(controlledValue)) {
      if (datasetColumnItems[0]?.items[0]) {
        onChangeValue(datasetColumnItems[0].items[0].value);
      }
    }
  }, [excludeColumns, datasetColumnItems, onChangeValue, controlledValue]);

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
          console.log(closestDatasetToTop);
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
                    onChange={onChangeValue}
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
