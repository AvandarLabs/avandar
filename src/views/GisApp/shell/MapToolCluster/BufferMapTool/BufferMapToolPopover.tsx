import { Popover } from "@mantine/core";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { useState } from "react";
import { BufferMapToolForm } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolForm";
import { BufferMapToolTrigger } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolTrigger";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type BufferConfirmOptions = {
  distanceMeters: number;
  dissolve: boolean;
};

type Props = {
  label: string;
  icon: ReactNode;
  onBufferConfirm: (options: BufferConfirmOptions) => void;
};

function _toggleBufferPopover(
  setDistanceMeters: Dispatch<SetStateAction<number>>,
  setDissolve: Dispatch<SetStateAction<boolean>>,
  setIsOpen: Dispatch<SetStateAction<boolean>>,
): void {
  setDistanceMeters(MapLayer.defaultBufferDistanceMeters);
  setDissolve(false);
  setIsOpen((current) => {
    return !current;
  });
}

function _confirmBufferPopover(options: {
  distanceMeters: number;
  dissolve: boolean;
  onBufferConfirm: (options: BufferConfirmOptions) => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}): void {
  const { distanceMeters, dissolve, onBufferConfirm, setIsOpen } = options;
  onBufferConfirm({
    distanceMeters: Math.min(1_000_000, Math.max(100, distanceMeters)),
    dissolve,
  });
  setIsOpen(false);
}

/** Popover that confirms buffer distance and dissolve. */
export function BufferMapToolPopover({
  label,
  icon,
  onBufferConfirm,
}: Props): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(
    MapLayer.defaultBufferDistanceMeters,
  );
  const [dissolve, setDissolve] = useState(false);
  const onConfirm = () => {
    _confirmBufferPopover({
      distanceMeters,
      dissolve,
      onBufferConfirm,
      setIsOpen,
    });
  };
  return (
    <Popover
      opened={isOpen}
      onDismiss={() => {
        setIsOpen(false);
      }}
      position="top"
      withArrow
      shadow="md"
      withinPortal
      transitionProps={{ duration: 0 }}
    >
      <Popover.Target>
        <BufferMapToolTrigger
          label={label}
          icon={icon}
          isOpen={isOpen}
          onClick={() => {
            _toggleBufferPopover(setDistanceMeters, setDissolve, setIsOpen);
          }}
        />
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <BufferMapToolForm
          distanceMeters={distanceMeters}
          dissolve={dissolve}
          onDistanceMetersChange={setDistanceMeters}
          onDissolveChange={setDissolve}
          onConfirm={onConfirm}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
