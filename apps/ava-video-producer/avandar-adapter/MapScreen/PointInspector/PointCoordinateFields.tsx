import { Select } from "@mantine/core";
import type { ReactNode } from "react";

const _noop = () => {
  return undefined;
};
/** Show the immutable latitude, longitude and optional time bindings. */
export function PointCoordinateFields(): ReactNode {
  return (
    <>
      <Select
        label="Latitude"
        placeholder="Select a column"
        value="latitude"
        data={["latitude", "longitude"]}
        searchable
        clearable
        onChange={_noop}
      />
      <Select
        label="Longitude"
        placeholder="Select a column"
        value="longitude"
        data={["latitude", "longitude"]}
        searchable
        clearable
        onChange={_noop}
      />
      <Select
        label="Time column"
        placeholder="Select a column"
        value={null}
        data={[]}
        clearable
        onChange={_noop}
      />
    </>
  );
}
