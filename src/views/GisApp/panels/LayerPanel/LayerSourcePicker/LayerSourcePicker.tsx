import { Popover } from "@mantine/core";
import { useState } from "react";
import { LayerSourcePickerDropdown } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePickerDropdown";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type TargetProps = {
  onClick: () => void;
  "aria-expanded": boolean;
};

type Props = {
  /** Renders the trigger with the props that control the picker. */
  children: (targetProps: TargetProps) => ReactNode;
  onSourceSelected: (dataSource: QueryDataSource.T) => void;
};

/** Picks the data source that creates a new map layer. */
export function LayerSourcePicker({
  children,
  onSourceSelected,
}: Props): ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      opened={isOpen}
      onDismiss={() => {
        setIsOpen(false);
      }}
      position="bottom-start"
      width={288}
      withinPortal
      shadow="lg"
    >
      <Popover.Target>
        {children({
          onClick: () => {
            setIsOpen((current) => {
              return !current;
            });
          },
          "aria-expanded": isOpen,
        })}
      </Popover.Target>
      <LayerSourcePickerDropdown
        onSourceSelected={(dataSource) => {
          setIsOpen(false);
          onSourceSelected(dataSource);
        }}
      />
    </Popover>
  );
}
