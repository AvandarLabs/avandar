import { Popover } from "@mantine/core";
import { useState } from "react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { BufferFilterStep } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferFilterStep";
import { BufferMapToolForm } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolForm";
import { BufferMapToolTrigger } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolTrigger";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type {
  BufferConfirmOptions,
  BufferLabelColumnOption,
  FilterByBufferOptions,
} from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  label: string;
  icon: ReactNode;
  layers: readonly MapLayer.T[];
  labelColumnOptions: readonly BufferLabelColumnOption[];
  canFilterAnotherLayer: boolean;
  onBufferConfirm: (options: BufferConfirmOptions) => MapLayer.Id | undefined;
  onFilterByBuffer: (options: FilterByBufferOptions) => void;
};

/** Smallest buffer distance the tool inserts, in meters. */
const MIN_BUFFER_DISTANCE_METERS = 100;

/** Largest buffer distance the tool inserts, in meters. */
const MAX_BUFFER_DISTANCE_METERS = 1_000_000;

type BufferFormState = {
  distance: number;
  distanceUnit: MapLayer.BufferDistanceUnit;
  dissolve: boolean;
  labelColumn: QueryColumn.Id | undefined;
  setDistance: (distance: number) => void;
  setDistanceUnit: (distanceUnit: MapLayer.BufferDistanceUnit) => void;
  setDissolve: (dissolve: boolean) => void;
  setLabelColumn: (labelColumn: QueryColumn.Id | undefined) => void;
  reset: () => void;
};

/** The form's values, reset to 1000 m each time the popover opens. */
function useBufferFormState(): BufferFormState {
  const [distance, setDistance] = useState<number>(
    MapLayer.defaultBufferDistanceMeters,
  );
  const [distanceUnit, setDistanceUnit] =
    useState<MapLayer.BufferDistanceUnit>("m");
  const [dissolve, setDissolve] = useState(false);
  const [labelColumn, setLabelColumn] = useState<QueryColumn.Id>();
  const reset = (): void => {
    setDistance(MapLayer.defaultBufferDistanceMeters);
    setDistanceUnit("m");
    setDissolve(false);
    setLabelColumn(undefined);
  };
  return {
    distance,
    distanceUnit,
    dissolve,
    labelColumn,
    setDistance,
    setDistanceUnit,
    setDissolve,
    setLabelColumn,
    reset,
  };
}

function _makeConfirmOptions(form: BufferFormState): BufferConfirmOptions {
  const distanceMeters = MapLayer.getMetersFromBufferDistance({
    distance: form.distance,
    unit: form.distanceUnit,
  });
  return {
    distanceMeters: Math.min(
      MAX_BUFFER_DISTANCE_METERS,
      Math.max(MIN_BUFFER_DISTANCE_METERS, distanceMeters),
    ),
    distanceUnit: form.distanceUnit,
    dissolve: form.dissolve,
    labelColumn: form.dissolve ? undefined : form.labelColumn,
  };
}

function _makeFormProps(
  form: BufferFormState,
  labelColumnOptions: readonly BufferLabelColumnOption[],
  onConfirm: () => void,
): ComponentProps<typeof BufferMapToolForm> {
  return {
    distance: form.distance,
    distanceUnit: form.distanceUnit,
    dissolve: form.dissolve,
    labelColumn: form.labelColumn,
    labelColumnOptions,
    onDistanceChange: form.setDistance,
    onDistanceUnitChange: form.setDistanceUnit,
    onDissolveChange: form.setDissolve,
    onLabelColumnChange: form.setLabelColumn,
    onConfirm,
  };
}

type BufferPopoverState = {
  isOpen: boolean;
  createdBufferLayerId: MapLayer.Id | undefined;
  form: BufferFormState;
  toggle: () => void;
  close: () => void;
  confirm: () => void;
};

/**
 * Whether the popover is open, the form's values, and the buffer the last
 * confirm added. A confirm stays open on the filter step only when there is
 * another point layer to filter.
 */
function useBufferPopoverState(
  options: Pick<Props, "canFilterAnotherLayer" | "onBufferConfirm">,
): BufferPopoverState {
  const [isOpen, setIsOpen] = useState(false);
  const [createdBufferLayerId, setCreatedBufferLayerId] =
    useState<MapLayer.Id>();
  const form = useBufferFormState();
  const close = (): void => {
    setIsOpen(false);
    setCreatedBufferLayerId(undefined);
  };
  const toggle = (): void => {
    form.reset();
    setCreatedBufferLayerId(undefined);
    setIsOpen((current) => {
      return !current;
    });
  };
  const confirm = (): void => {
    const bufferLayerId = options.onBufferConfirm(_makeConfirmOptions(form));
    if (bufferLayerId && options.canFilterAnotherLayer) {
      setCreatedBufferLayerId(bufferLayerId);
      return;
    }
    close();
  };
  return { isOpen, createdBufferLayerId, form, toggle, close, confirm };
}

/**
 * Popover that confirms a buffer's distance, unit, dissolve, and ring label,
 * then offers to filter a point layer by the new buffer.
 */
export function BufferMapToolPopover({
  label,
  icon,
  layers,
  labelColumnOptions,
  canFilterAnotherLayer,
  onBufferConfirm,
  onFilterByBuffer,
}: Props): ReactNode {
  const state = useBufferPopoverState({
    canFilterAnotherLayer,
    onBufferConfirm,
  });
  const { createdBufferLayerId } = state;
  return (
    <Popover
      opened={state.isOpen}
      onDismiss={state.close}
      position="top"
      withArrow
      shadow="md"
      withinPortal
      transitionProps={{ duration: 0 }}
      // The tool cluster floats over the map and never scrolls away, so
      // there is no detached state to hide the dropdown for.
      hideDetached={false}
    >
      <Popover.Target>
        <BufferMapToolTrigger
          label={label}
          icon={icon}
          isOpen={state.isOpen}
          onClick={state.toggle}
        />
      </Popover.Target>
      <Popover.Dropdown p="sm">
        {createdBufferLayerId ? (
          <BufferFilterStep
            layers={layers}
            bufferLayerId={createdBufferLayerId}
            onFilter={(targetLayerId) => {
              onFilterByBuffer({
                bufferLayerId: createdBufferLayerId,
                targetLayerId,
              });
              state.close();
            }}
            onDone={state.close}
          />
        ) : (
          <BufferMapToolForm
            {..._makeFormProps(state.form, labelColumnOptions, state.confirm)}
          />
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
